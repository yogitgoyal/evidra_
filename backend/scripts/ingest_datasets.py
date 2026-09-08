import argparse
import asyncio
import csv
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func, select

from app.db import SessionLocal, dispose_engine
from app.models.case import Case
from app.models.datasets import BankingRecord, CdrRecord, IdentityRecord, IpdrRecord, SocialRecord

DATASETS = {
    "cdr.csv": (CdrRecord, ("caller", "callee", "duration_seconds")),
    "ipdr.csv": (IpdrRecord, ("source_ip", "destination_ip", "protocol")),
    "banking.csv": (BankingRecord, ("sender", "recipient", "amount", "channel")),
    "social.csv": (SocialRecord, ("actor", "target", "platform", "interaction")),
    "identity.csv": (IdentityRecord, ("subject", "document_type", "document_hash")),
}


def parse_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as source:
        return list(csv.DictReader(source))


async def ingest(data_dir: Path) -> dict[str, int]:
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    async with SessionLocal() as db:
        counts: dict[str, int] = {}
        for filename, (model, fields) in DATASETS.items():
            rows = read_rows(data_dir / filename)
            case_ids = {row["case_id"] for row in rows}
            for case_id in case_ids:
                if await db.get(Case, case_id) is None:
                    db.add(Case(id=case_id, name=f"Imported Case {case_id}"))
            await db.flush()
            records = []
            existing_ids = set(await db.scalars(select(model.id).where(model.id.in_([row["id"] for row in rows]))))
            for row in rows:
                if row["id"] in existing_ids:
                    continue
                values = {field: row[field] for field in fields}
                if "duration_seconds" in values:
                    values["duration_seconds"] = int(values["duration_seconds"])
                if "amount" in values:
                    values["amount"] = float(values["amount"])
                records.append(model(
                    id=row["id"],
                    case_id=row["case_id"],
                    timestamp=parse_timestamp(row.get("timestamp")),
                    attributes={key: value for key, value in row.items() if key not in {"id", "case_id", "timestamp", *fields}},
                    **values,
                ))
            if records:
                db.add_all(records)
                await db.flush()
            counts[filename] = len(records)
        await db.commit()
        for filename, (model, _) in DATASETS.items():
            counts[f"{filename}:persisted"] = await db.scalar(select(func.count()).select_from(model)) or 0
        return counts


async def main() -> None:
    parser = argparse.ArgumentParser(description="Bulk-ingest EVIDRA synthetic CSV datasets.")
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).parents[1] / "data")
    args = parser.parse_args()
    try:
        print(await ingest(args.data_dir))
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(main())
