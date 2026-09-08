import csv
import io
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.case import Case
from app.models.datasets import BankingRecord, CdrRecord, SocialRecord

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
    records = []
    rejected = []
    for line_number, row in await _rows(file):
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
            ))
        except (TypeError, ValueError, OverflowError) as error:
            rejected.append({"row": line_number, "reason": str(error)})
    return await _commit(records, rejected, db)


@router.post("/cases/{case_id}/banking/bulk")
async def upload_banking_bulk(case_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)) -> dict:
    await _case_or_404(case_id, db)
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
                sender=row["sender"],
                recipient=row["recipient"],
                amount=amount,
                channel=row.get("channel") or "UPI",
                timestamp=_timestamp(row.get("timestamp")),
                attributes={},
            ))
        except (TypeError, ValueError, OverflowError) as error:
            rejected.append({"row": line_number, "reason": str(error)})
    return await _commit(records, rejected, db)


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
