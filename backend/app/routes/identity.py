from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.case import Case
from app.models.datasets import IdentityRecord

router = APIRouter(tags=["identity"])


class IdentityCreate(BaseModel):
    subject: str
    document_type: str = "Unknown"
    document_hash: str
    timestamp: datetime | None = None


class IdentityRead(IdentityCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    timestamp: datetime


@router.post("/cases/{case_id}/identity", response_model=IdentityRead, status_code=201)
async def create_identity(case_id: str, payload: IdentityCreate, db: AsyncSession = Depends(get_db)) -> IdentityRecord:
    if await db.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    record = IdentityRecord(
        id=str(uuid4()), case_id=case_id, subject=payload.subject,
        document_type=payload.document_type, document_hash=payload.document_hash,
        timestamp=payload.timestamp or datetime.utcnow(), attributes={},
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/cases/{case_id}/identity", response_model=list[IdentityRead])
async def list_identity(case_id: str, db: AsyncSession = Depends(get_db)) -> list[IdentityRecord]:
    result = await db.scalars(
        select(IdentityRecord).where(IdentityRecord.case_id == case_id).order_by(IdentityRecord.timestamp.desc())
    )
    return list(result)
