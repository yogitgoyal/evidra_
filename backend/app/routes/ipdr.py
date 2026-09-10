import ipaddress
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.case import Case
from app.models.audit import AuditLogEntry
from app.models.datasets import IpdrRecord
from app.store import store

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

    for field_name, value in (
        ("source_ip", payload.source_ip),
        ("destination_ip", payload.destination_ip),
    ):
        try:
            ipaddress.ip_address(value)
        except ValueError as error:
            raise HTTPException(
                status_code=400,
                detail=f"{field_name} must be a valid IPv4 or IPv6 address",
            ) from error

    record = IpdrRecord(
        id=str(uuid4()),
        case_id=case_id,
        source_ip=payload.source_ip,
        destination_ip=payload.destination_ip,
        protocol=payload.protocol,
        timestamp=payload.timestamp or datetime.utcnow(),
        attributes={},
    )
    audit = AuditLogEntry(
        case_id=case_id,
        user="system",
        action="ipdr_record_created",
        entity_type="ipdr_record",
        entity_id=record.id,
        details={
            "source_type": "manual",
            "source_ip": record.source_ip,
            "destination_ip": record.destination_ip,
            "protocol": record.protocol,
        },
    )
    db.add(record)
    db.add(audit)
    try:
        await store._ensure_provenance(db, case_id, [record], "ipdr_manual_entry")
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    await db.refresh(record)
    return record


@router.get("/cases/{case_id}/ipdr", response_model=list[IpdrRead])
async def list_ipdr(case_id: str, db: AsyncSession = Depends(get_db)) -> list[IpdrRecord]:
    if await db.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    result = await db.scalars(
        select(IpdrRecord).where(IpdrRecord.case_id == case_id).order_by(IpdrRecord.timestamp.desc())
    )
    return list(result)
