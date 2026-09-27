from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import Base
from app.models.case import Case
from app.models.datasets import CdrRecord
from app.store import DataStore


@pytest_asyncio.fixture
async def geo_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


async def make_case(db, case_id: str, seed_type: str | None = None, seed_value: str | None = None) -> Case:
    case = Case(
        id=case_id,
        name=case_id,
        investigation_mode="entity" if seed_value else "evidence",
        seed_type=seed_type,
        seed_value=seed_value,
        status="active",
        priority="medium",
        lead="Test",
        tags=[],
    )
    db.add(case)
    await db.commit()
    return case


def cdr(case_id: str, record_id: str, caller: str, callee: str) -> CdrRecord:
    return CdrRecord(
        id=record_id,
        case_id=case_id,
        caller=caller,
        callee=callee,
        duration_seconds=30,
        timestamp=datetime(2026, 8, 20, 10, tzinfo=timezone.utc),
        attributes={"latitude": 30.74, "longitude": 76.78},
    )


@pytest.mark.asyncio
async def test_geo_marks_seed_as_caller_and_direct_contact(geo_db):
    case = await make_case(geo_db, "seed-caller", "phone", "9876500001")
    geo_db.add_all([
        cdr(case.id, "seed-call", "9876500001", "9876500002"),
        cdr(case.id, "contact-call", "9876500002", "9876500003"),
        cdr(case.id, "unrelated-call", "9876500004", "9876500005"),
    ])
    await geo_db.commit()

    points = await DataStore().geo_for_case(case.id, geo_db)
    by_id = {point["id"]: point for point in points}
    assert by_id["seed-call"]["is_seed"] is True
    assert by_id["seed-call"]["hop"] == 1
    assert by_id["contact-call"]["hop"] == 1
    assert "is_seed" not in by_id["contact-call"]
    assert "is_seed" not in by_id["unrelated-call"]
    assert "hop" not in by_id["unrelated-call"]


@pytest.mark.asyncio
async def test_geo_marks_seed_as_callee(geo_db):
    case = await make_case(geo_db, "seed-callee", "phone", "9876500001")
    geo_db.add(cdr(case.id, "callee-call", "9876500002", "9876500001"))
    await geo_db.commit()

    points = await DataStore().geo_for_case(case.id, geo_db)
    assert points[0]["is_seed"] is True
    assert points[0]["hop"] == 1


@pytest.mark.asyncio
async def test_geo_without_seed_preserves_point_shape(geo_db):
    case = await make_case(geo_db, "no-seed")
    geo_db.add(cdr(case.id, "plain-call", "9876500001", "9876500002"))
    await geo_db.commit()

    points = await DataStore().geo_for_case(case.id, geo_db)
    assert "is_seed" not in points[0]
    assert "hop" not in points[0]


@pytest.mark.asyncio
async def test_geo_account_seed_does_not_match_phone_cdr_values(geo_db):
    case = await make_case(geo_db, "account-seed", "bank_account", "9876500001")
    geo_db.add(cdr(case.id, "account-collision", "9876500001", "9876500002"))
    await geo_db.commit()

    points = await DataStore().geo_for_case(case.id, geo_db)
    assert "is_seed" not in points[0]
    assert "hop" not in points[0]


@pytest.mark.asyncio
async def test_geo_normalizes_seed_phone_values(geo_db):
    case = await make_case(geo_db, "normalized-seed", "phone", "9876500001")
    geo_db.add(cdr(case.id, "formatted-call", "+91 9876500001", "9876500002"))
    await geo_db.commit()

    points = await DataStore().geo_for_case(case.id, geo_db)
    assert points[0]["is_seed"] is True
