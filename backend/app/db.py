import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

def _async_database_url(url: str | None) -> str | None:
    if not url:
        return None
    if url.startswith("sqlite://") and "+aiosqlite" not in url:
        return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    normalized = url.replace("postgres://", "postgresql://", 1)
    if normalized.startswith("postgresql://"):
        normalized = normalized.replace("postgresql://", "postgresql+asyncpg://", 1)
    if normalized.startswith("postgresql+psycopg://"):
        normalized = normalized.replace("postgresql+psycopg://", "postgresql+asyncpg://", 1)
    parts = urlsplit(normalized)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    if query.pop("sslmode", None) == "require":
        query["ssl"] = "require"
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


DATABASE_URL = _async_database_url(os.getenv("DATABASE_URL"))
engine: AsyncEngine | None = (
    create_async_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None
)
SessionLocal: async_sessionmaker[AsyncSession] | None = (
    async_sessionmaker(engine, expire_on_commit=False) if engine else None
)


class Base(DeclarativeBase):
    pass


async def dispose_engine() -> None:
    if engine:
        await engine.dispose()
