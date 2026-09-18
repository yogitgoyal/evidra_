from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import Base
from app.models.case import Case
from app.models.datasets import BankingRecord, CdrRecord, IpdrRecord, ReportRecord, SocialRecord
from app.store import store


@pytest_asyncio.fixture
async def story_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_story_deduplicates_facts_and_covers_all_evidence(story_session):
    case_id = "story_generation_case"
    timestamp = datetime(2026, 8, 1, 9, tzinfo=timezone.utc)
    story_session.add_all([
        Case(id=case_id, name="Story generation case", status="active", priority="medium", lead="Test", tags=[]),
        CdrRecord(id="call_1", case_id=case_id, caller="111", callee="222", duration_seconds=60, timestamp=timestamp, attributes={}),
        CdrRecord(id="call_2", case_id=case_id, caller="111", callee="222", duration_seconds=60, timestamp=timestamp, attributes={}),
        BankingRecord(id="transfer_1", case_id=case_id, sender="111", recipient="acct-222", amount=100, channel="UPI", timestamp=timestamp, attributes={}),
        SocialRecord(id="message_1", case_id=case_id, actor="111", target="222", platform="WhatsApp", interaction="message", timestamp=timestamp, attributes={}),
        IpdrRecord(id="connection_1", case_id=case_id, source_ip="192.0.2.1", destination_ip="198.51.100.1", protocol="TCP", timestamp=timestamp, attributes={}),
    ])
    await story_session.commit()

    result = await store.story_claims_for_case(case_id, story_session)

    assert result["provider"] == "deterministic-evidence-bundle"
    assert result["provenanceVerified"] is True
    assert result["narrative"].count("111 called 222 for 60 seconds") == 1
    assert "Following this call, 111 transferred 100.00 to acct-222 via UPI" in result["narrative"]
    cited_ids = {evidence_id for claim in result["claims"] for evidence_id in claim["evidenceIds"]}
    assert cited_ids == {
        "ev_call_1",
        "ev_call_2",
        "ev_transfer_1",
        "ev_message_1",
        "ev_connection_1",
    }
    assert result["uncitedSentences"] == []


@pytest.mark.asyncio
async def test_story_keeps_report_abbreviations_inside_cited_sentences(story_session):
    case_id = "story_report_case"
    timestamp = datetime(2026, 8, 1, 9, tzinfo=timezone.utc)
    story_session.add_all([
        Case(id=case_id, name="Story report case", status="active", priority="medium", lead="Test", tags=[]),
        ReportRecord(
            id="report_1",
            case_id=case_id,
            raw_text="On 18th May 2026, Mr. Ravi Kumar reported unauthorized UPI transactions from his account.",
            submitted_by="test-officer",
            submitted_at=timestamp,
            extracted_entities=[],
            timestamp=datetime(2026, 8, 1, 9, tzinfo=timezone.utc),
            attributes={},
        ),
    ])
    await story_session.commit()

    result = await store.story_claims_for_case(case_id, story_session)

    assert result["uncitedSentences"] == []
    assert len(result["claims"]) == 1
    assert result["claims"][0]["evidenceIds"] == ["ev_report_1"]


def test_story_sentence_splitter_keeps_currency_and_fir_abbreviations_together():
    sentences = store._split_story_sentences(
        "The complainant was told to pay Rs. 45,000. He later paid Rs. 15,000. FIR No. 245/2026 was registered."
    )

    assert sentences == [
        "The complainant was told to pay Rs. 45,000.",
        "He later paid Rs. 15,000.",
        "FIR No. 245/2026 was registered.",
    ]


def test_story_validator_keeps_uncited_specific_claims_invalid():
    result = store._validate_narrative(
        "Following this call, funds moved [ev_call_1]. An unsupported specific claim.",
        {"ev_call_1"},
    )

    assert result["provenanceVerified"] is False
    assert result["uncitedSentences"] == ["An unsupported specific claim."]