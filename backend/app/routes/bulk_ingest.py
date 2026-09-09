import csv
import hashlib
import io
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.cdr_file_extractors import extract_cdr_rows
from app.models.case import Case
from app.models.audit import AuditLogEntry
from app.models.datasets import BankingRecord, BankingUploadBatch, CdrRecord, EvidenceRecordRow, SocialRecord

router = APIRouter(tags=["bulk-ingestion"])


def _timestamp(value: str | None) -> datetime:
    if not value or not value.strip():
        return datetime.now(timezone.utc)
    parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


async def _rows(file: UploadFile) -> list[tuple[int, dict[str, str]]]:
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file must include a header row.")
    return [(line_number, {key.strip(): (value or "").strip() for key, value in row.items() if key}) for line_number, row in enumerate(reader, start=2)]


def _required(row: dict[str, str], fields: tuple[str, ...]) -> None:
    missing = [field for field in fields if not row.get(field)]
    if missing:
        raise ValueError(f"Missing required field(s): {', '.join(missing)}")


async def _case_or_404(case_id: str, db: AsyncSession) -> None:
    if await db.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found.")


async def _commit(records: list, rejected: list[dict[str, str]], db: AsyncSession) -> dict:
    try:
        if records:
            db.add_all(records)
            await db.commit()
    except Exception:
        await db.rollback()
        raise
    return {
        "created": len(records),
        "rejected": rejected,
        "sample_ids": [record.id for record in records[:5]],
    }


@router.post("/cases/{case_id}/cdr/bulk")
async def upload_cdr_bulk(case_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)) -> dict:
    await _case_or_404(case_id, db)
    file_bytes = await file.read()
    try:
        rows = extract_cdr_rows(file.filename or "", file.content_type, file_bytes)
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    records = []
    rejected = []
    for line_number, row in rows:
        try:
            _required(row, ("caller", "callee"))
            duration = int(row.get("duration_seconds") or 0)
            if duration < 0:
                raise ValueError("duration_seconds must be non-negative")
            records.append(CdrRecord(
                id=str(uuid4()),
                case_id=case_id,
                caller=row["caller"],
                callee=row["callee"],
                duration_seconds=duration,
                timestamp=_timestamp(row.get("timestamp")),
                attributes={},
                original_filename=file.filename,
                original_content_type=file.content_type,
                original_file=file_bytes,
            ))
        except (TypeError, ValueError, OverflowError) as error:
            rejected.append({"row": line_number, "reason": str(error)})

    batch_id = f"cdr_upload_{uuid4()}"
    content_hash = hashlib.sha256(file_bytes).hexdigest()
    evidence = EvidenceRecordRow(
        id=f"ev_{batch_id}",
        case_id=case_id,
        source="CDR",
        source_record_id=batch_id,
        rule="CDR_FILE_IMPORT",
        transformation="cdr_tabular_file_import",
        content_hash=content_hash,
        fields={
            "sourceType": "file",
            "originalFilename": file.filename,
            "originalContentType": file.content_type,
            "created": len(records),
            "rejected": len(rejected),
        },
        timestamp=datetime.now(timezone.utc),
    )
    audit = AuditLogEntry(
        case_id=case_id,
        user="system",
        action="cdr_file_uploaded",
        entity_type="cdr_upload",
        entity_id=batch_id,
        details={
            "source_type": "file",
            "original_filename": file.filename,
            "original_content_type": file.content_type,
            "content_hash": content_hash,
            "created": len(records),
            "rejected": len(rejected),
        },
    )
    try:
        if records:
            db.add_all(records)
        db.add_all([evidence, audit])
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    return {
        "created": len(records),
        "rejected": rejected,
        "sample_ids": [record.id for record in records[:5]],
        "upload_id": batch_id,
        "content_hash": content_hash,
    }


@router.post("/cases/{case_id}/banking/bulk")
async def upload_banking_bulk(
    case_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    source_type: str | None = Form(None),
) -> dict:
    await _case_or_404(case_id, db)
    if source_type not in {None, "file", "paste"}:
        raise HTTPException(status_code=400, detail="source_type must be file or paste.")
    file_bytes = await file.read()
    await file.seek(0)
    records = []
    rejected = []
    for line_number, row in await _rows(file):
        try:
            _required(row, ("sender", "recipient", "amount"))
            amount = float(row["amount"])
            if amount < 0:
                raise ValueError("amount must be non-negative")
            records.append(BankingRecord(
                id=str(uuid4()),
                case_id=case_id,
                batch_id=None,
                sender=row["sender"],
                recipient=row["recipient"],
                amount=amount,
                channel=row.get("channel") or "UPI",
                timestamp=_timestamp(row.get("timestamp")),
                attributes={},
            ))
        except (TypeError, ValueError, OverflowError) as error:
            rejected.append({"row": line_number, "reason": str(error)})
    if source_type == "paste":
        result = await _commit(records, rejected, db)
        result["has_source_file"] = False
        return result

    batch = BankingUploadBatch(
        id=f"banking_upload_{uuid4()}",
        case_id=case_id,
        original_filename=file.filename or "banking.csv",
        original_content_type=file.content_type,
        original_file=file_bytes,
    )
    for record in records:
        record.batch_id = batch.id
    db.add(batch)
    try:
        await db.flush()
        if records:
            db.add_all(records)
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    return {
        "created": len(records),
        "rejected": rejected,
        "sample_ids": [record.id for record in records[:5]],
        "batch_id": batch.id,
        "has_source_file": True,
    }


@router.get("/cases/{case_id}/banking/bulk-uploads/{batch_id}/file")
async def get_banking_bulk_upload_file(
    case_id: str,
    batch_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    batch = await db.scalar(
        select(BankingUploadBatch).where(
            BankingUploadBatch.id == batch_id,
            BankingUploadBatch.case_id == case_id,
        )
    )
    if batch is None:
        raise HTTPException(status_code=404, detail="Banking upload batch not found.")
    filename = batch.original_filename.replace('"', "")
    return Response(
        content=batch.original_file,
        media_type=batch.original_content_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.post("/cases/{case_id}/social/bulk")
async def upload_social_bulk(case_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)) -> dict:
    await _case_or_404(case_id, db)
    records = []
    rejected = []
    for line_number, row in await _rows(file):
        try:
            _required(row, ("actor", "target"))
            records.append(SocialRecord(
                id=str(uuid4()),
                case_id=case_id,
                actor=row["actor"],
                target=row["target"],
                platform=row.get("platform") or "Unknown",
                interaction=row.get("interaction") or "message",
                timestamp=_timestamp(row.get("timestamp")),
                attributes={},
            ))
        except (TypeError, ValueError, OverflowError) as error:
            rejected.append({"row": line_number, "reason": str(error)})
    return await _commit(records, rejected, db)


@router.post("/cases/demo-seed", status_code=201)
async def seed_demo_case(db: AsyncSession = Depends(get_db)) -> dict:
    case_id = str(uuid4())
    db.add(Case(id=case_id, name="EVIDRA Synthetic Investigation"))
    await db.commit()
    sample_dir = Path(__file__).parents[2] / "sample_data"
    uploads = {
        "cdr": UploadFile(file=io.BytesIO((sample_dir / "cdr.csv").read_bytes()), filename="cdr.csv"),
        "banking": UploadFile(file=io.BytesIO((sample_dir / "banking.csv").read_bytes()), filename="banking.csv"),
        "social": UploadFile(file=io.BytesIO((sample_dir / "social.csv").read_bytes()), filename="social.csv"),
    }
    return {
        "case_id": case_id,
        "name": "EVIDRA Synthetic Investigation",
        "cdr": await upload_cdr_bulk(case_id, uploads["cdr"], db),
        "banking": await upload_banking_bulk(case_id, uploads["banking"], db),
        "social": await upload_social_bulk(case_id, uploads["social"], db),
    }
