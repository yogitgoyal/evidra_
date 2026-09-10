from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.case import Case
from app.models.audit import AuditLogEntry
from app.models.datasets import SocialRecord
from app.store import store

router = APIRouter(tags=["social"])


class SocialCreate(BaseModel):
    actor: str
    target: str
    platform: str = "Unknown"
    interaction: str = "message"
    timestamp: datetime | None = None


class SocialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    actor: str
    target: str
    platform: str
    interaction: str
    timestamp: datetime


@router.post("/cases/{case_id}/social", response_model=SocialRead, status_code=201)
async def create_social(case_id: str, payload: SocialCreate, db: AsyncSession = Depends(get_db)) -> SocialRecord:
    case = await db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    record = SocialRecord(
        id=str(uuid4()),
        case_id=case_id,
        actor=payload.actor,
        target=payload.target,
        platform=payload.platform,
        interaction=payload.interaction,
        timestamp=payload.timestamp or datetime.utcnow(),
        attributes={},
    )
    audit = AuditLogEntry(
        case_id=case_id,
        user="system",
        action="social_record_created",
        entity_type="social_record",
        entity_id=record.id,
        details={
            "source_type": "manual",
            "actor": record.actor,
            "target": record.target,
            "platform": record.platform,
            "interaction": record.interaction,
        },
    )
    db.add(record)
    db.add(audit)
    try:
        await store._ensure_provenance(db, case_id, [record], "social_manual_entry")
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    await db.refresh(record)
    return record


@router.get("/cases/{case_id}/social", response_model=list[SocialRead])
async def list_social(case_id: str, db: AsyncSession = Depends(get_db)) -> list[SocialRecord]:
    if await db.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    result = await db.scalars(
        select(SocialRecord).where(SocialRecord.case_id == case_id).order_by(SocialRecord.timestamp.desc())
    )
    return list(result)