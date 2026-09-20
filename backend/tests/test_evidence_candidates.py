import io
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import Base
from app.models.audit import AuditLogEntry
from app.models.case import Case
from app.models.datasets import BankingRecord, CdrRecord, EvidenceRecordRow, IpdrRecord
from app.candidates import discover_candidates
from app.routes.bulk_ingest import upload_banking_bulk
from app.routes.cases import CaseCreate


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


async def add_case(db, case_id: str, clue_type: str | None = None, clue_value: str | None = None) -> Case:
    case = Case(
        id=case_id,
        name=case_id,
        investigation_mode="evidence",
        evidence_types=["CDR"],
        clue_type=clue_type,
        clue_value=clue_value,
        status="active",
        priority="medium",
        lead="Test",
        tags=[],
    )
    db.add(case)
    await db.commit()
    return case


@pytest.mark.parametrize(
    ("clue_type", "clue_value", "message"),
    [
        ("phone", "abc", "digits only"),
        ("ip", "999.1.1.1", "valid IPv4"),
        ("transaction_id", "", "must not be empty"),
        ("amount_time", "10|2026-08-20T10:00:00", "timezone offset"),
        ("amount_time", "not-money|2026-08-20T10:00:00+00:00", "valid decimal"),
    ],
)
def test_clue_values_are_validated(clue_type, clue_value, message):
    with pytest.raises(Exception, match=message):
        CaseCreate(name="clue", investigation_mode="evidence", clue_type=clue_type, clue_value=clue_value)


def test_legacy_evidence_case_and_clue_case_are_accepted():
    assert CaseCreate(name="legacy", investigation_mode="evidence", evidence_types=["CDR"]).clue_type is None
    payload = CaseCreate(name="clue", investigation_mode="evidence", clue_type="phone", clue_value="9876500001")
    assert payload.clue_value == "9876500001"


@pytest.mark.asyncio
async def test_banking_bulk_optional_clue_columns_are_stored(db):
    await add_case(db, "banking-case")
    file = UploadFile(
        file=io.BytesIO(b"sender,recipient,amount,timestamp,transaction_id,upi_ref,upi_reference\nA,B,100,2026-08-20T10:00:00+00:00, tx-1 , upi-1 ,\n"),
        filename="banking.csv",
        headers={"content-type": "text/csv"},
    )
    result = await upload_banking_bulk("banking-case", file, db, "paste")
    assert result["created"] == 1
    record = await db.scalar(select(BankingRecord).where(BankingRecord.case_id == "banking-case"))
    assert record.attributes == {"transaction_id": "tx-1", "upi_ref": "upi-1"}


@pytest.mark.asyncio
async def test_banking_bulk_without_clue_columns_keeps_empty_attributes(db):
    await add_case(db, "banking-legacy")
    file = UploadFile(
        file=io.BytesIO(b"sender,recipient,amount,timestamp\nA,B,100,2026-08-20T10:00:00+00:00\n"),
        filename="banking.csv",
        headers={"content-type": "text/csv"},
    )
    await upload_banking_bulk("banking-legacy", file, db, "paste")
    record = await db.scalar(select(BankingRecord).where(BankingRecord.case_id == "banking-legacy"))
    assert record.attributes == {}


@pytest.mark.asyncio
async def test_phone_candidates_are_typed_and_have_counterparties(db):
    case = await add_case(db, "phone-case", "phone", "9876500001")
    db.add_all([
        CdrRecord(id="cdr-phone-1", case_id=case.id, caller="9876500001", callee="9876500002", timestamp=datetime(2026, 8, 20, 10, tzinfo=timezone.utc), attributes={}),
        CdrRecord(id="cdr-phone-2", case_id=case.id, caller="9876500001", callee="9876500002", timestamp=datetime(2026, 8, 20, 11, tzinfo=timezone.utc), attributes={}),
        BankingRecord(id="bank-collision", case_id=case.id, sender="9876500001", recipient="acct-1", amount=100, channel="UPI", timestamp=datetime(2026, 8, 20, 10, tzinfo=timezone.utc), attributes={}),
    ])
    await db.commit()
    result = await discover_candidates(case, db)
    ids = {item["entity"]["id"] for item in result["candidates"]}
    assert "phone:9876500001" in ids
    assert "phone:9876500002" in ids
    assert "bank_account:9876500001" not in ids
    assert any("Counterparty interacted 2 time(s)" in reason for item in result["candidates"] for reason in item["reasons"])
    assert "ev_cdr-phone-1" in result["candidates"][0]["matching_evidence_ids"]


@pytest.mark.asyncio
async def test_ip_candidates_match_ipdr_and_are_case_scoped(db):
    first = await add_case(db, "ip-first", "ip", "192.0.2.1")
    second = await add_case(db, "ip-second", "ip", "192.0.2.1")
    db.add_all([
        IpdrRecord(id="ip-first-record", case_id=first.id, source_ip="192.0.2.1", destination_ip="192.0.2.2", protocol="TCP", timestamp=datetime(2026, 8, 20, 10, tzinfo=timezone.utc), attributes={}),
        IpdrRecord(id="ip-second-record", case_id=second.id, source_ip="192.0.2.1", destination_ip="192.0.2.3", protocol="TCP", timestamp=datetime(2026, 8, 20, 10, tzinfo=timezone.utc), attributes={}),
    ])
    await db.commit()
    result = await discover_candidates(first, db)
    record_ids = {record_id for item in result["candidates"] for record_id in item["matching_record_ids"]}
    assert record_ids == {"ip-first-record"}


@pytest.mark.asyncio
async def test_amount_time_window_and_transaction_reference_rules(db):
    case = await add_case(db, "bank-match", "amount_time", "100.00|2026-08-20T10:00:00+00:00")
    db.add_all([
        BankingRecord(id="bank-in-window", case_id=case.id, sender="acct-a", recipient="acct-b", amount=100, channel="UPI", timestamp=datetime(2026, 8, 20, 10, 5, tzinfo=timezone.utc), attributes={}),
        BankingRecord(id="bank-out-window", case_id=case.id, sender="acct-c", recipient="acct-d", amount=100, channel="UPI", timestamp=datetime(2026, 8, 20, 10, 6, tzinfo=timezone.utc), attributes={}),
    ])
    await db.commit()
    result = await discover_candidates(case, db)
    assert {rid for item in result["candidates"] for rid in item["matching_record_ids"]} == {"bank-in-window"}

    case.clue_type = "transaction_id"
    case.clue_value = "not-stored"
    await db.commit()
    result = await discover_candidates(case, db)
    assert result["candidates"] == []
    assert "No stored allowlisted" in result["reason"]


@pytest.mark.asyncio
async def test_confirmation_recomputes_and_overwrites_seed_while_staying_evidence(db):
    case = await add_case(db, "confirm-case", "phone", "9876500001")
    db.add_all([
        CdrRecord(id="confirm-1", case_id=case.id, caller="9876500001", callee="9876500002", timestamp=datetime(2026, 8, 20, 10, tzinfo=timezone.utc), attributes={}),
        CdrRecord(id="confirm-2", case_id=case.id, caller="9876500001", callee="9876500003", timestamp=datetime(2026, 8, 20, 11, tzinfo=timezone.utc), attributes={}),
    ])
    await db.commit()
    from app.candidates import confirm_candidate
    first = await confirm_candidate(case, "phone:9876500002", db)
    assert first["entity"]["type"] == "phone"
    assert case.investigation_mode == "evidence"
    assert case.seed_value == "9876500002"
    await confirm_candidate(case, "phone:9876500003", db)
    assert case.seed_value == "9876500003"
    audit_count = await db.scalar(select(AuditLogEntry).where(AuditLogEntry.case_id == case.id))
    assert audit_count is not None
    from app.store import store
    graph = await store.graph_for_case(case.id, db)
    assert any(entity.id == "phone:9876500003" and "Starting point" in entity.tags for entity in graph.entities)


@pytest.mark.asyncio
async def test_account_candidate_confirmation_maps_to_bank_account(db):
    case = await add_case(db, "account-case", "transaction_id", "tx-1")
    db.add(BankingRecord(id="account-record", case_id=case.id, sender="acct-a", recipient="acct-b", amount=1, channel="UPI", timestamp=datetime(2026, 8, 20, 10, tzinfo=timezone.utc), attributes={"transaction_id": "tx-1"}))
    await db.commit()
    result = await discover_candidates(case, db)
    assert {item["entity"]["type"] for item in result["candidates"]} == {"bank_account"}


@pytest.mark.asyncio
async def test_legacy_case_reads_have_null_clues(db):
    case = await add_case(db, "legacy-read")
    assert case.clue_type is None
    assert case.clue_value is None
    assert await db.scalar(select(EvidenceRecordRow).where(EvidenceRecordRow.case_id == case.id)) is None
