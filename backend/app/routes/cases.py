from datetime import date, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, literal, select, update, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.audit import AuditLogEntry
from app.models.case import Case
from app.models.datasets import BankingRecord, CdrRecord, EvidenceRecordRow, IpdrRecord, SocialRecord

router = APIRouter(tags=["cases"])


class CaseCreate(BaseModel):
    name: str
    id: str | None = None
    case_type: str | None = None
    description: str | None = None
    investigation_mode: str = "entity"
    seed_type: str | None = None
    seed_value: str | None = None
    evidence_type: str | None = None
    incident_date: date | None = None
    event_description: str | None = None
    status: str = "active"
    priority: str = "medium"
    lead: str = "Unassigned"
    tags: list[str] = []


class CaseRead(CaseCreate):
    model_config = ConfigDict(from_attributes=True)

    created_at: datetime
    title: str
    opened: str
    entities: int
    alerts: int
    riskScore: int


@router.post("/cases", response_model=CaseRead, status_code=201)
async def create_case(payload: CaseCreate, db: AsyncSession = Depends(get_db)) -> Case:
    case = Case(
        id=payload.id or str(uuid4()),
        name=payload.name,
        case_type=payload.case_type,
        description=payload.description,
        investigation_mode=payload.investigation_mode,
        seed_type=payload.seed_type,
        seed_value=payload.seed_value,
        evidence_type=payload.evidence_type,
        incident_date=payload.incident_date,
        event_description=payload.event_description,
        status=payload.status,
        priority=payload.priority,
        lead=payload.lead,
        tags=payload.tags,
    )
    db.add(case)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    await db.refresh(case)
    return _serialize(case, {})


@router.get("/cases", response_model=list[CaseRead])
async def list_cases(db: AsyncSession = Depends(get_db)) -> list[dict]:
    result = await db.scalars(select(Case).order_by(Case.created_at.desc(), Case.id))
    cases = list(result)
    counts = await _counts_for_cases(db, [case.id for case in cases])
    return [_serialize(case, counts[case.id]) for case in cases]


@router.get("/cases/{case_id}", response_model=CaseRead)
async def get_case(case_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    case = await db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    return _serialize(case, await _counts(db, case_id))


async def _counts(db: AsyncSession, case_id: str) -> dict[str, int]:
    counts = {}
    for key, model in (("cdr", CdrRecord), ("ipdr", IpdrRecord), ("banking", BankingRecord), ("social", SocialRecord), ("evidence", EvidenceRecordRow)):
        counts[key] = int(await db.scalar(select(func.count()).select_from(model).where(model.case_id == case_id)) or 0)
    counts["entities"] = counts["cdr"] * 2 + counts["ipdr"] * 2 + counts["social"] * 2 + counts["banking"] * 2
    counts["alerts"] = int(counts["banking"] > 0) + int(counts["evidence"] > 0)
    return counts


async def _counts_for_cases(db: AsyncSession, case_ids: list[str]) -> dict[str, dict[str, int]]:
    if not case_ids:
        return {}

    count_queries = [
        select(
            model.case_id.label("case_id"),
            literal(key).label("kind"),
            func.count().label("record_count"),
        )
        .where(model.case_id.in_(case_ids))
        .group_by(model.case_id)
        for key, model in (
            ("cdr", CdrRecord),
            ("ipdr", IpdrRecord),
            ("banking", BankingRecord),
            ("social", SocialRecord),
            ("evidence", EvidenceRecordRow),
        )
    ]
    combined = union_all(*count_queries).subquery()
    counts = {
        case_id: {"cdr": 0, "ipdr": 0, "banking": 0, "social": 0, "evidence": 0}
        for case_id in case_ids
    }
    result = await db.execute(
        select(combined.c.case_id, combined.c.kind, combined.c.record_count)
    )
    for case_id, kind, record_count in result:
        counts[case_id][kind] = int(record_count)

    for case_counts in counts.values():
        case_counts["entities"] = (
            case_counts["cdr"] * 2
            + case_counts["ipdr"] * 2
            + case_counts["social"] * 2
            + case_counts["banking"] * 2
        )
        case_counts["alerts"] = int(case_counts["banking"] > 0) + int(case_counts["evidence"] > 0)
    return counts


def _serialize(case: Case, counts: dict[str, int]) -> dict:
    return {
        "id": case.id, "name": case.name, "title": case.name, "created_at": case.created_at,
        "case_type": case.case_type, "description": case.description,
        "investigation_mode": case.investigation_mode, "seed_type": case.seed_type,
        "seed_value": case.seed_value, "evidence_type": case.evidence_type,
        "incident_date": case.incident_date, "event_description": case.event_description,
        "opened": case.created_at.date().isoformat(), "status": case.status, "priority": case.priority,
        "lead": case.lead, "tags": case.tags or [], "entities": counts.get("entities", 0),
        "alerts": counts.get("alerts", 0), "riskScore": min(100, counts.get("alerts", 0) * 20),
    }
@router.delete("/cases/{case_id}", status_code=204)
async def delete_case(case_id: str, db: AsyncSession = Depends(get_db)) -> None:
    case = await db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    db.add(
        AuditLogEntry(
            case_id=case.id,
            user="system",
            action="case_deleted",
            entity_type="case",
            entity_id=case.id,
            details={"deleted_case_id": case.id, "case_name": case.name},
        )
    )
    await db.flush()
    await db.execute(
        update(AuditLogEntry)
        .where(AuditLogEntry.case_id == case.id)
        .values(case_id=None)
    )
    await db.delete(case)
    await db.commit()
