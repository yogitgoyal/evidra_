from datetime import date, datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.candidates import confirm_candidate
from app.db import Base
from app.models.case import Case
from app.models.datasets import CdrRecord
from app.store import DataStore


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


async def add_case(db, case_id: str, mode: str, **fields) -> Case:
    case = Case(
        id=case_id,
        name=case_id,
        investigation_mode=mode,
        status="active",
        priority="medium",
        lead="Test",
        tags=[],
        **fields,
    )
    db.add(case)
    await db.commit()
    return case


def cdr(case_id: str, record_id: str, caller: str, callee: str, timestamp: datetime | None = None) -> CdrRecord:
    return CdrRecord(
        id=record_id,
        case_id=case_id,
        caller=caller,
        callee=callee,
        timestamp=timestamp or datetime(2026, 8, 20, 10, tzinfo=timezone.utc),
        attributes={},
    )


@pytest.mark.asyncio
async def test_entity_starting_point_counts_matching_records_and_unique_first_hops(db):
    case = await add_case(
        db,
        "entity-matches",
        "entity",
        seed_type="phone",
        seed_value="+91 98765 00001",
    )
    db.add_all([
        cdr(case.id, "entity-1", "9876500001", "9876500002"),
        cdr(case.id, "entity-2", "9876500002", "+91 98765 00001"),
    ])
    await db.commit()

    overview = await DataStore().overview_for_case(case.id, db)

    assert overview["starting_point"] == {
        "mode": "entity",
        "seed": {"type": "phone", "value": "+91 98765 00001"},
        "matching_record_count": 2,
        "first_hop_contact_count": 1,
    }
    assert overview["suggested_next_step"] is None


@pytest.mark.asyncio
async def test_entity_seed_without_matching_records_suggests_next_step(db):
    case = await add_case(db, "entity-no-match", "entity", seed_type="phone", seed_value="9876500001")

    overview = await DataStore().overview_for_case(case.id, db)

    assert overview["starting_point"]["matching_record_count"] == 0
    assert overview["starting_point"]["first_hop_contact_count"] == 0
    assert overview["suggested_next_step"] == {
        "code": "no_seed_matches",
        "text": "No records match this seed",
    }


@pytest.mark.asyncio
async def test_evidence_without_clue_has_legacy_empty_state(db):
    case = await add_case(db, "evidence-no-clue", "evidence")

    overview = await DataStore().overview_for_case(case.id, db)

    assert overview["starting_point"] == {
        "mode": "evidence",
        "clue": None,
        "state": "no_clue",
        "candidate_count": 0,
        "confirmed_candidate": None,
    }
    assert overview["suggested_next_step"] is None


@pytest.mark.asyncio
async def test_evidence_clue_without_candidates_has_empty_state(db):
    case = await add_case(
        db,
        "evidence-no-candidates",
        "evidence",
        clue_type="phone",
        clue_value="9876500001",
    )

    overview = await DataStore().overview_for_case(case.id, db)

    assert overview["starting_point"]["state"] == "no_candidates"
    assert overview["starting_point"]["candidate_count"] == 0
    assert overview["suggested_next_step"]["code"] == "ingest_matching_evidence"


@pytest.mark.asyncio
async def test_evidence_candidates_are_unconfirmed_until_seeded(db):
    case = await add_case(
        db,
        "evidence-unconfirmed",
        "evidence",
        clue_type="phone",
        clue_value="9876500001",
    )
    db.add(cdr(case.id, "candidate-record", "9876500001", "9876500002"))
    await db.commit()

    overview = await DataStore().overview_for_case(case.id, db)

    assert overview["starting_point"]["state"] == "candidates_unconfirmed"
    assert overview["starting_point"]["candidate_count"] > 0
    assert overview["starting_point"]["confirmed_candidate"] is None
    assert overview["suggested_next_step"]["code"] == "review_candidate"


@pytest.mark.asyncio
async def test_evidence_confirmed_candidate_is_reported(db):
    case = await add_case(
        db,
        "evidence-confirmed",
        "evidence",
        clue_type="phone",
        clue_value="9876500001",
    )
    db.add(cdr(case.id, "confirmed-record", "9876500001", "9876500002"))
    await db.commit()
    await confirm_candidate(case, "phone:9876500002", db)

    overview = await DataStore().overview_for_case(case.id, db)

    assert overview["starting_point"]["state"] == "confirmed"
    assert overview["starting_point"]["confirmed_candidate"] == {
        "type": "phone",
        "value": "9876500002",
    }
    assert overview["suggested_next_step"] is None


@pytest.mark.asyncio
async def test_event_without_window_has_no_count_or_suggestion(db):
    case = await add_case(db, "event-no-window", "event", event_location="Central Station")
    db.add(cdr(case.id, "outside-record", "111", "222"))
    await db.commit()

    overview = await DataStore().overview_for_case(case.id, db)

    assert overview["starting_point"]["window"] is None
    assert overview["starting_point"]["location"]["label"] == "Central Station"
    assert overview["starting_point"]["record_count"] == 0
    assert overview["suggested_next_step"] is None


@pytest.mark.asyncio
async def test_event_window_with_zero_records_suggests_widening(db):
    case = await add_case(
        db,
        "event-zero-records",
        "event",
        incident_date=date(2026, 8, 20),
        incident_start_time=datetime(2026, 8, 20, 12, tzinfo=timezone.utc),
        incident_end_time=datetime(2026, 8, 20, 13, tzinfo=timezone.utc),
        event_lat=30.7,
        event_lng=76.7,
        event_radius_m=500,
    )
    db.add(cdr(case.id, "outside-window", "111", "222", datetime(2026, 8, 20, 11, tzinfo=timezone.utc)))
    await db.commit()

    overview = await DataStore().overview_for_case(case.id, db)

    assert overview["starting_point"]["record_count"] == 0
    assert overview["starting_point"]["location"] == {
        "label": None,
        "latitude": 30.7,
        "longitude": 76.7,
        "radius_m": 500,
    }
    assert overview["suggested_next_step"]["code"] == "widen_event_window"


@pytest.mark.asyncio
async def test_event_window_with_records_has_no_suggestion(db):
    case = await add_case(
        db,
        "event-has-records",
        "event",
        incident_date=date(2026, 8, 20),
        incident_start_time=datetime(2026, 8, 20, 12, tzinfo=timezone.utc),
        incident_end_time=datetime(2026, 8, 20, 13, tzinfo=timezone.utc),
    )
    db.add_all([
        cdr(case.id, "inside-window", "111", "222", datetime(2026, 8, 20, 12, 30, tzinfo=timezone.utc)),
        cdr(case.id, "outside-window", "333", "444", datetime(2026, 8, 20, 13, tzinfo=timezone.utc)),
    ])
    await db.commit()

    overview = await DataStore().overview_for_case(case.id, db)

    assert overview["starting_point"]["record_count"] == 1
    assert overview["suggested_next_step"] is None