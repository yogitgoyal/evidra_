from datetime import date, datetime, timezone

import httpx
import pytest
import pytest_asyncio
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.auth import create_access_token
from app.db import Base
from app.deps import get_db
from app.main import app
from app.models.case import Case
from app.routes.cases import CaseCreate


def test_entity_mode_requires_seed_fields():
    with pytest.raises(ValidationError, match="Entity-led cases require"):
        CaseCreate(name="Entity case", investigation_mode="entity")


def test_event_mode_requires_dates_and_order():
    with pytest.raises(ValidationError, match="Event-led cases require"):
        CaseCreate(name="Event case", investigation_mode="event")

    with pytest.raises(ValidationError, match="end_date must be on or after"):
        CaseCreate(
            name="Event case",
            investigation_mode="event",
            incident_date=date(2026, 8, 2),
            incident_end_date=date(2026, 8, 1),
        )


def test_evidence_mode_requires_evidence_type():
    with pytest.raises(ValidationError, match="Evidence-led cases require"):
        CaseCreate(name="Evidence case", investigation_mode="evidence")


def test_valid_mode_payloads_are_accepted():
    assert CaseCreate(
        name="Entity case",
        investigation_mode="entity",
        seed_type="phone",
        seed_value="9876543210",
    )
    assert CaseCreate(
        name="Event case",
        investigation_mode="event",
        incident_date=date(2026, 8, 1),
        incident_end_date=date(2026, 8, 2),
    )
    assert CaseCreate(
        name="Evidence case",
        investigation_mode="evidence",
        evidence_types=["CDR"],
    )


@pytest_asyncio.fixture
async def legacy_cases_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        session.add_all([
            Case(
                id="legacy-entity-case",
                name="Legacy entity case",
                investigation_mode="entity",
                status="active",
                priority="medium",
                lead="Legacy",
                tags=[],
            ),
            Case(
                id="legacy-evidence-case",
                name="Legacy evidence case",
                investigation_mode="evidence",
                evidence_types=[],
                status="active",
                priority="medium",
                lead="Legacy",
                tags=[],
            ),
            Case(
                id="legacy-event-case",
                name="Legacy event case",
                investigation_mode="event",
                incident_date=date(2026, 8, 1),
                status="active",
                priority="medium",
                lead="Legacy",
                tags=[],
            ),
        ])
        await session.commit()
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_case_reads_accept_legacy_mode_fields(legacy_cases_session):
    async def override_db():
        yield legacy_cases_session

    app.dependency_overrides[get_db] = override_db
    try:
        transport = httpx.ASGITransport(app=app)
        headers = {"Authorization": f"Bearer {create_access_token('demo')}"}
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            list_response = await client.get("/cases", headers=headers)
            assert list_response.status_code == 200
            assert {case["id"] for case in list_response.json()} == {
                "legacy-entity-case",
                "legacy-evidence-case",
                "legacy-event-case",
            }

            for case_id in (
                "legacy-entity-case",
                "legacy-evidence-case",
                "legacy-event-case",
            ):
                response = await client.get(f"/cases/{case_id}", headers=headers)
                assert response.status_code == 200
                assert response.json()["id"] == case_id
    finally:
        app.dependency_overrides.pop(get_db, None)