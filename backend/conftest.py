import pytest_asyncio
from app.db import dispose_engine

@pytest_asyncio.fixture(autouse=True)
async def cleanup_db_engine():
    yield
    await dispose_engine()
