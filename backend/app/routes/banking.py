from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.case import Case
from app.models.datasets import BankingRecord
from app.store import store

router = APIRouter(tags=["banking"])


class BankingCreate(BaseModel):
    sender: str
    recipient: str
    amount: float
    channel: str = "UPI"
    timestamp: datetime | None = None


class BankingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    sender: str
    recipient: str
    amount: float
    channel: str
    timestamp: datetime


@router.post("/cases/{case_id}/banking", response_model=BankingRead, status_code=201)
async def create_banking(case_id: str, payload: BankingCreate, db: AsyncSession = Depends(get_db)) -> BankingRecord:
    case = await db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    record = BankingRecord(
        id=str(uuid4()),
        case_id=case_id,
        sender=payload.sender,
        recipient=payload.recipient,
        amount=payload.amount,
        channel=payload.channel,
        timestamp=payload.timestamp or datetime.utcnow(),
        attributes={},
    )
    db.add(record)
    try:
        await store._ensure_provenance(db, case_id, [record], "banking_manual_entry")
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    await db.refresh(record)
    return record


@router.get("/cases/{case_id}/banking", response_model=list[BankingRead])
async def list_banking(case_id: str, db: AsyncSession = Depends(get_db)) -> list[BankingRecord]:
    result = await db.scalars(
        select(BankingRecord).where(BankingRecord.case_id == case_id).order_by(BankingRecord.timestamp.desc())
    )
    return list(result)