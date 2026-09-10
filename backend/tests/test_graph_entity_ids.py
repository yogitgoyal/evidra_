from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import Base
from app.models.case import Case
from app.models.datasets import BankingRecord, CdrRecord, IpdrRecord, ReportRecord, SocialRecord
from app.store import normalize_account, normalize_phone, store


@pytest_asyncio.fixture
async def graph_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


def test_normalize_phone_accepts_indian_variants():
    variants = (
        "9876543210",
        "+919876543210",
        "+91 98765 43210",
        "091-9876543210",
    )

    assert {normalize_phone(value) for value in variants} == {"9876543210"}


def test_normalize_account_strips_whitespace_and_case():
    assert normalize_account("  AC 9876 5432 ") == "ac98765432"
    assert normalize_account("AC98765432") == "ac98765432"


@pytest.mark.asyncio
async def test_graph_uses_typed_ids_and_possible_same_identifier_edges(graph_session):
    case_id = "47e35c7e-83ee-4e98-9db5-8fd93c0bd06c"
    timestamp = datetime(2026, 8, 1, 9, tzinfo=timezone.utc)
    graph_session.add_all([
        Case(id=case_id, name="Cross-linked graph test", status="active", priority="medium", lead="Test", tags=[]),
        CdrRecord(
            id="cdr_cross_linked",
            case_id=case_id,
            caller="+91 98765 43210",
            callee="9123456780",
            duration_seconds=60,
            timestamp=timestamp,
            attributes={},
        ),
        IpdrRecord(
            id="ipdr_cross_linked",
            case_id=case_id,
            source_ip="192.168.1.105",
            destination_ip="10.0.0.55",
            protocol="TCP",
            timestamp=timestamp,
            attributes={},
        ),
        BankingRecord(
            id="bank_cross_linked",
            case_id=case_id,
            sender="9876543210",
            recipient="rajesh.verma@upi",
            amount=100.0,
            channel="UPI",
            timestamp=timestamp,
            attributes={},
        ),
        SocialRecord(
            id="social_cross_linked",
            case_id=case_id,
            actor="rajesh.verma",
            target="9123456780",
            platform="WhatsApp",
            interaction="message",
            timestamp=timestamp,
            attributes={},
        ),
        ReportRecord(
            id="report_cross_linked",
            case_id=case_id,
            raw_text="Phone 9876543210 appears in the FIR.",
            submitted_by="test",
            submitted_at=timestamp,
            extracted_entities=[{
                "type": "phone",
                "value": "9876543210",
                "confidence": "high",
                "offset": 6,
            }],
            timestamp=timestamp,
            attributes={},
        ),
    ])
    await graph_session.commit()

    graph = await store.graph_for_case(case_id, graph_session)
    ids = {entity.id for entity in graph.entities}
    assert "phone:9876543210" in ids
    assert "account:9876543210" in ids
    assert "phone:9876543210" in ids
    assert "9876543210" not in ids
    assert "social:9123456780" in ids
    assert "social:9123456780" in ids

    possible_edges = [
        edge for edge in graph.edges
        if edge.kind == "POSSIBLE_SAME_IDENTIFIER"
        and {edge.source, edge.target} == {"phone:9876543210", "account:9876543210"}
    ]
    assert len(possible_edges) == 1
    assert possible_edges[0].confidence == "ambiguous"
    assert possible_edges[0].evidenceIds == []

    phone_report_ids = [entity.id for entity in graph.entities if entity.id == "phone:9876543210"]
    assert len(phone_report_ids) == 1
    assert not any(
        edge.kind == "POSSIBLE_SAME_IDENTIFIER"
        and {edge.source, edge.target} == {"phone:9876543210", "phone:9876543210"}
        for edge in graph.edges
    )
