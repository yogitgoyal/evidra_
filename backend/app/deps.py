from collections.abc import AsyncGenerator

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import SessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured.")
    async with SessionLocal() as session:
        yield session
