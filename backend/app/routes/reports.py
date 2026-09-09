from datetime import datetime, timezone
import hashlib
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_officer
from app.deps import get_db
from app.models.audit import AuditLogEntry
from app.models.case import Case
from app.models.datasets import EvidenceRecordRow, ReportRecord
from app.report_extractor import extract_entities

router = APIRouter(tags=["reports"])


class ReportCreate(BaseModel):
    raw_text: str


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    raw_text: str
    submitted_by: str
    submitted_at: datetime
    extracted_entities: list[dict]


@router.post(
    "/cases/{case_id}/reports",
    response_model=ReportRead,
    status_code=201,
)
async def create_report(
    case_id: str,
    payload: ReportCreate,
    user: dict = Depends(require_officer),
    db: AsyncSession = Depends(get_db),
) -> ReportRecord:
    if not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="Report text must not be empty.")

    if await db.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    submitted_at = datetime.now(timezone.utc)
    report_id = str(uuid4())
    entities = extract_entities(payload.raw_text)
    record = ReportRecord(
        id=report_id,
        case_id=case_id,
        timestamp=submitted_at,
        attributes={},
        raw_text=payload.raw_text,
        submitted_by=str(user.get("sub", "unknown")),
        submitted_at=submitted_at,
        extracted_entities=entities,
    )
    evidence = EvidenceRecordRow(
        id=f"ev_{report_id}",
        case_id=case_id,
        source="Report",
        source_record_id=report_id,
        rule="REGEX_ENTITY_EXTRACTION",
        transformation="report_entity_extraction",
        content_hash=hashlib.sha256(payload.raw_text.encode("utf-8")).hexdigest(),
        fields={"rawText": payload.raw_text, "entityCount": len(entities)},
        timestamp=submitted_at,
    )
    audit = AuditLogEntry(
        case_id=case_id,
        user=str(user.get("sub", "unknown")),
        action="report_submitted",
        entity_type="report",
        entity_id=report_id,
        details={"extracted_entity_count": len(entities)},
    )
    db.add_all([record, evidence, audit])
    await db.commit()
    await db.refresh(record)
    return record


@router.get(
    "/cases/{case_id}/reports",
    response_model=list[ReportRead],
)
async def list_reports(
    case_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[ReportRecord]:
    if await db.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    result = await db.scalars(
        select(ReportRecord)
        .where(ReportRecord.case_id == case_id)
        .order_by(ReportRecord.submitted_at.desc())
    )
    return list(result)
