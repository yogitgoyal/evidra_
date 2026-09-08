from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.case import Case
from app.models.datasets import CdrRecord

router = APIRouter(tags=["cdr"])


class CdrCreate(BaseModel):
    caller: str
    callee: str
    duration_seconds: int = 0
    timestamp: datetime | None = None


class CdrRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    caller: str
    callee: str
    duration_seconds: int
    timestamp: datetime


@router.post("/cases/{case_id}/cdr", response_model=CdrRead, status_code=201)
async def create_cdr(case_id: str, payload: CdrCreate, db: AsyncSession = Depends(get_db)) -> CdrRecord:
    case = await db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    record = CdrRecord(
        id=str(uuid4()),
        case_id=case_id,
        caller=payload.caller,
        callee=payload.callee,
        duration_seconds=payload.duration_seconds,
        timestamp=payload.timestamp or datetime.utcnow(),
        attributes={},
    )
    db.add(record)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    await db.refresh(record)
    return record


@router.get("/cases/{case_id}/cdr", response_model=list[CdrRead])
async def list_cdr(case_id: str, db: AsyncSession = Depends(get_db)) -> list[CdrRecord]:
    result = await db.scalars(
        select(CdrRecord).where(CdrRecord.case_id == case_id).order_by(CdrRecord.timestamp.desc())
    )
    return list(result)