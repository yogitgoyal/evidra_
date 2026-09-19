from datetime import date, datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import Base
from app.models.case import Case
from app.models.datasets import BankingRecord, CdrRecord, EvidenceRecordRow, IpdrRecord, SocialRecord
from app.models import TimelineEvent
from app.store import DataStore, to_utc


class FakeDb:
    def __init__(self, case, records):
        self.case = case
        self.records = records

    async def get(self, model, case_id):
        return self.case if model is Case and case_id == self.case.id else None

    async def scalars(self, query):
        model = query.column_descriptions[0]["entity"]
        return [record for record in self.records if isinstance(record, model)]


@pytest.fixture
def case():
    return Case(
        id="case-timestamps",
        name="Timestamp test",
        investigation_mode="event",
        incident_date=date(2026, 8, 20),
        incident_end_date=date(2026, 8, 20),
    )


@pytest_asyncio.fixture
async def evidence_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


def test_to_utc_treats_naive_as_utc_and_converts_offsets():
    naive = datetime(2026, 8, 20, 12, 0)
    offset = datetime.fromisoformat("2026-08-20T17:30:00+05:30")

    assert to_utc(naive) == datetime(2026, 8, 20, 12, 0, tzinfo=timezone.utc)
    assert to_utc(offset) == datetime(2026, 8, 20, 12, 0, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_timeline_sorts_mixed_timestamps_by_true_instant(monkeypatch, case):
    case.investigation_mode = "entity"
    records = [
        CdrRecord(
            id="naive",
            case_id=case.id,
            caller="1",
            callee="2",
            timestamp=datetime(2026, 8, 20, 12, 0),
            attributes={},
        ),
        CdrRecord(
            id="offset-later",
            case_id=case.id,
            caller="3",
            callee="4",
            timestamp=datetime.fromisoformat("2026-08-20T18:00:00+05:30"),
            attributes={},
        ),
        CdrRecord(
            id="offset-earlier",
            case_id=case.id,
            caller="5",
            callee="6",
            timestamp=datetime.fromisoformat("2026-08-20T07:00:00-04:00"),
            attributes={},
        ),
    ]

    async def skip_provenance(self, db, case_id, rows, transformation):
        return {row.id: f"ev_{row.id}" for row in rows}

    monkeypatch.setattr(DataStore, "_ensure_provenance", skip_provenance)
    events = await DataStore().timeline_for_case(case.id, FakeDb(case, records))

    assert [event.id for event in events] == ["offset-earlier", "naive", "offset-later"]
    assert all(datetime.fromisoformat(event.timestamp).tzinfo == timezone.utc for event in events)
    assert [event.timestamp for event in events] == [
        "2026-08-20T11:00:00+00:00",
        "2026-08-20T12:00:00+00:00",
        "2026-08-20T12:30:00+00:00",
    ]


@pytest.mark.asyncio
async def test_store_datetime_comparisons_accept_mixed_timestamps(monkeypatch, case):
    records = [
        CdrRecord(
            id="cdr",
            case_id=case.id,
            caller="1",
            callee="2",
            timestamp=datetime(2026, 8, 20, 12, 0),
            attributes={"latitude": 30.7, "longitude": 76.7},
        ),
        BankingRecord(
            id="banking",
            case_id=case.id,
            sender="a",
            recipient="b",
            amount=100,
            channel="UPI",
            timestamp=datetime.fromisoformat("2026-08-20T17:30:00+05:30"),
            attributes={},
        ),
        SocialRecord(
            id="social",
            case_id=case.id,
            actor="a",
            target="b",
            platform="test",
            interaction="message",
            timestamp=datetime.fromisoformat("2026-08-20T08:00:00-04:00"),
            attributes={},
        ),
        IpdrRecord(
            id="ipdr",
            case_id=case.id,
            source_ip="192.0.2.1",
            destination_ip="198.51.100.1",
            protocol="TCP",
            timestamp=datetime(2026, 8, 20, 12, 0),
            attributes={},
        ),
    ]

    result = await DataStore().risk_factors_for_case(case.id, FakeDb(case, records))

    assert result["riskFactors"]


def test_event_seed_starts_at_midnight_ist_as_utc(case):
    event = DataStore._seed_event_for_case(case)

    assert event.timestamp == "2026-08-19T18:30:00+00:00"
    assert datetime.fromisoformat(event.timestamp).tzinfo == timezone.utc


@pytest.mark.asyncio
async def test_evidence_filters_normalize_mixed_bounds_for_sqlite(evidence_db):
    case_id = "evidence-timestamps"
    evidence_db.add(Case(id=case_id, name="Evidence timestamps"))
    evidence_db.add_all([
        EvidenceRecordRow(
            id="before", case_id=case_id, source="CDR", source_record_id="before",
            rule="test", transformation="test", content_hash="a", fields={},
            timestamp=datetime(2026, 8, 20, 11),
        ),
        EvidenceRecordRow(
            id="boundary", case_id=case_id, source="CDR", source_record_id="boundary",
            rule="test", transformation="test", content_hash="b", fields={},
            timestamp=datetime(2026, 8, 20, 12),
        ),
        EvidenceRecordRow(
            id="after", case_id=case_id, source="CDR", source_record_id="after",
            rule="test", transformation="test", content_hash="c", fields={},
            timestamp=datetime(2026, 8, 20, 13),
        ),
    ])
    await evidence_db.commit()

    result = await DataStore().evidence_for_case(
        case_id,
        evidence_db,
        from_timestamp=datetime.fromisoformat("2026-08-20T17:30:00+05:30"),
        to_timestamp=datetime(2026, 8, 20, 13),
    )

    assert [record.id for record in result] == ["boundary"]


@pytest.mark.asyncio
async def test_fallback_timeline_sorts_mixed_timestamp_strings(case):
    data_store = DataStore()
    data_store.cases = [case]
    data_store.timeline = [
        TimelineEvent(id="naive", timestamp="2026-08-20T12:00:00", title="", description="", source="CDR", entityIds=[], evidenceIds=[], severity="info"),
        TimelineEvent(id="offset-later", timestamp="2026-08-20T18:00:00+05:30", title="", description="", source="CDR", entityIds=[], evidenceIds=[], severity="info"),
        TimelineEvent(id="offset-earlier", timestamp="2026-08-20T07:00:00-04:00", title="", description="", source="CDR", entityIds=[], evidenceIds=[], severity="info"),
    ]

    events = await data_store.timeline_for_case(case.id)

    assert [event.id for event in events] == ["offset-earlier", "naive", "offset-later"]
