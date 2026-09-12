from datetime import datetime, timezone

import httpx
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.models
from app.auth import create_access_token
from app.db import Base
from app.deps import get_db
from app.main import app, store
from app.models.case import Case
from app.models.datasets import CdrRecord


@pytest_asyncio.fixture
async def dashboard_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_dashboard_uses_real_cases_and_has_no_seed_content(dashboard_session):
    case = Case(
        id="real-dashboard-case",
        name="Real dashboard case",
        status="active",
        priority="medium",
        lead="Analyst",
        tags=[],
    )
    dashboard_session.add(case)
    await dashboard_session.flush()
    dashboard_session.add(CdrRecord(
        id="real-dashboard-cdr",
        case_id=case.id,
        caller="100",
        callee="200",
        timestamp=datetime.now(timezone.utc),
        attributes={},
    ))
    await dashboard_session.commit()

    result = await store.dashboard_for_user(dashboard_session)
    payload = str(result)
    assert result["summary"]["caseCount"] == 1
    assert result["summary"]["activeCases"] == 1
    assert result["summary"]["entitiesTracked"] == 2
    assert [item["id"] for item in result["cases"]] == [case.id]
    assert not any(seed_id in payload for seed_id in ("2047", "1988", "1954", "1901"))
    assert result["alerts"] == []


@pytest.mark.asyncio
async def test_dashboard_route_uses_database_session(dashboard_session):
    async def override_db():
        yield dashboard_session

    app.dependency_overrides[get_db] = override_db
    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"Authorization": f"Bearer {create_access_token('demo')}"}
            response = await client.get("/dashboard", headers=headers)
            assert response.status_code == 200
            body = response.json()
            assert body["summary"]["caseCount"] == 0
            assert body["cases"] == []
            assert body["alerts"] == []
            assert all(seed_id not in response.text for seed_id in ("2047", "1988", "1954", "1901"))
    finally:
        app.dependency_overrides.pop(get_db, None)