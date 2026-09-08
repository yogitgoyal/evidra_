from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.case import Case
from app.models.datasets import IpdrRecord

router = APIRouter(tags=["ipdr"])


class IpdrCreate(BaseModel):
    source_ip: str
    destination_ip: str
    protocol: str = "TCP"
    timestamp: datetime | None = None


class IpdrRead(IpdrCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    timestamp: datetime


@router.post("/cases/{case_id}/ipdr", response_model=IpdrRead, status_code=201)
async def create_ipdr(case_id: str, payload: IpdrCreate, db: AsyncSession = Depends(get_db)) -> IpdrRecord:
    if await db.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    record = IpdrRecord(
        id=str(uuid4()), case_id=case_id, source_ip=payload.source_ip,
        destination_ip=payload.destination_ip, protocol=payload.protocol,
        timestamp=payload.timestamp or datetime.utcnow(), attributes={},
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/cases/{case_id}/ipdr", response_model=list[IpdrRead])
async def list_ipdr(case_id: str, db: AsyncSession = Depends(get_db)) -> list[IpdrRecord]:
    result = await db.scalars(
        select(IpdrRecord).where(IpdrRecord.case_id == case_id).order_by(IpdrRecord.timestamp.desc())
    )
    return list(result)
