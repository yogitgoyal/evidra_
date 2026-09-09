from datetime import datetime, timezone
import hashlib
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_officer
from app.deps import get_db
from app.models.audit import AuditLogEntry
from app.models.case import Case
from app.models.datasets import EvidenceRecordRow, ReportRecord
from app.report_extractor import extract_entities
from app.report_file_extractors import extract_text_from_document

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


@router.post(
    "/cases/{case_id}/reports/file",
    response_model=ReportRead,
    status_code=201,
)
async def create_report_from_file(
    case_id: str,
    file: UploadFile = File(...),
    raw_text: str | None = Form(None),
    user: dict = Depends(require_officer),
    db: AsyncSession = Depends(get_db),
) -> ReportRecord:
    is_valid_type = file.content_type in {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    is_valid_extension = (file.filename or "").casefold().endswith((".pdf", ".docx"))
    if not is_valid_type and not is_valid_extension:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    if await db.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    file_bytes = await file.read()
    try:
        extracted_text = extract_text_from_document(
            filename=file.filename or "",
            content_type=file.content_type,
            content=file_bytes,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    combined_text = extracted_text if not raw_text else f"{raw_text}\n\n{extracted_text}"
    if not combined_text.strip():
        raise HTTPException(status_code=400, detail="Report contains no extractable text.")

    submitted_at = datetime.now(timezone.utc)
    report_id = str(uuid4())
    entities = extract_entities(combined_text)
    record = ReportRecord(
        id=report_id,
        case_id=case_id,
        timestamp=submitted_at,
        attributes={},
        raw_text=combined_text,
        submitted_by=str(user.get("sub", "unknown")),
        submitted_at=submitted_at,
        extracted_entities=entities,
        original_filename=file.filename,
        original_content_type=file.content_type,
        original_file=file_bytes,
    )
    evidence = EvidenceRecordRow(
        id=f"ev_{report_id}",
        case_id=case_id,
        source="Report",
        source_record_id=report_id,
        rule="REGEX_ENTITY_EXTRACTION",
        transformation="report_entity_extraction",
        content_hash=hashlib.sha256(combined_text.encode("utf-8")).hexdigest(),
        fields={"rawText": combined_text, "entityCount": len(entities)},
        timestamp=submitted_at,
    )
    audit = AuditLogEntry(
        case_id=case_id,
        user=str(user.get("sub", "unknown")),
        action="report_submitted",
        entity_type="report",
        entity_id=report_id,
        details={
            "extracted_entity_count": len(entities),
            "source_type": "file",
            "original_filename": file.filename,
        },
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
