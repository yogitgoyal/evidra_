from datetime import date, datetime
from decimal import Decimal, InvalidOperation
import ipaddress
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, literal, select, update, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.audit import AuditLogEntry
from app.models.case import Case
from app.models.datasets import BankingRecord, CdrRecord, EvidenceRecordRow, IpdrRecord, SocialRecord
from app.store import to_utc
from app.candidates import CandidateError, confirm_candidate, discover_candidates

router = APIRouter(tags=["cases"])


class CaseBase(BaseModel):
    name: str
    id: str | None = None
    case_type: str | None = None
    description: str | None = None
    investigation_mode: str = "entity"
    seed_type: str | None = None
    seed_value: str | None = None
    evidence_type: str | None = None
    evidence_types: list[str] = Field(default_factory=list)
    clue_type: str | None = None
    clue_value: str | None = None
    incident_date: date | None = None
    incident_end_date: date | None = None
    incident_start_time: datetime | None = None
    incident_end_time: datetime | None = None
    event_description: str | None = None
    event_location: str | None = None
    event_lat: float | None = None
    event_lng: float | None = None
    event_radius_m: float | None = None
    status: str = "active"
    priority: str = "medium"
    lead: str = "Unassigned"
    tags: list[str] = Field(default_factory=list)

class CaseCreate(CaseBase):
    @model_validator(mode="after")
    def validate_mode_fields(self) -> "CaseCreate":
        if self.investigation_mode == "entity":
            if not self.seed_type or not self.seed_value or not self.seed_value.strip():
                raise ValueError("Entity-led cases require seed_type and a non-empty seed_value.")
        elif self.investigation_mode == "event":
            if self.incident_date is None or self.incident_end_date is None:
                raise ValueError("Event-led cases require incident_date and incident_end_date.")
            if self.incident_end_date < self.incident_date:
                raise ValueError("Event-led incident_end_date must be on or after incident_date.")
            if self.incident_start_time and self.incident_end_time:
                if to_utc(self.incident_end_time) < to_utc(self.incident_start_time):
                    raise ValueError("Event-led incident_end_time must be on or after incident_start_time.")
            if (self.event_lat is None) != (self.event_lng is None):
                raise ValueError("Event-led event_lat and event_lng must be provided together.")
            if self.event_lat is not None and not -90 <= self.event_lat <= 90:
                raise ValueError("Event-led event_lat must be between -90 and 90.")
            if self.event_lng is not None and not -180 <= self.event_lng <= 180:
                raise ValueError("Event-led event_lng must be between -180 and 180.")
            if self.event_radius_m is not None and self.event_radius_m < 0:
                raise ValueError("Event-led event_radius_m must be non-negative.")
            if self.event_lat is not None and self.event_radius_m is None:
                self.event_radius_m = 1000
        elif self.investigation_mode == "evidence":
            if (self.clue_type is None) != (self.clue_value is None):
                raise ValueError("Evidence-led clue_type and clue_value must be provided together.")
            if not self.evidence_types and self.clue_type is None:
                raise ValueError("Evidence-led cases require a clue or at least one evidence type.")
            if self.clue_type is not None:
                if self.clue_type not in {"transaction_id", "upi_ref", "phone", "ip", "amount_time"}:
                    raise ValueError("Unsupported evidence clue_type.")
                value = (self.clue_value or "").strip()
                if not value:
                    raise ValueError("Evidence clue_value must not be empty.")
                if self.clue_type == "phone" and (not value.isdigit() or len(value) < 7):
                    raise ValueError("Phone clue_value must contain digits only and be at least 7 digits.")
                if self.clue_type == "ip":
                    try:
                        ipaddress.ip_address(value)
                    except ValueError as error:
                        raise ValueError("IP clue_value must be a valid IPv4 or IPv6 address.") from error
                if self.clue_type in {"transaction_id", "upi_ref"} and not value:
                    raise ValueError("Identifier clue_value must not be empty.")
                if self.clue_type == "amount_time":
                    parts = value.split("|", 1)
                    if len(parts) != 2:
                        raise ValueError("amount_time clue_value must be amount|timestamp.")
                    try:
                        amount = Decimal(parts[0].strip())
                    except InvalidOperation as error:
                        raise ValueError("amount_time amount must be a valid decimal.") from error
                    if amount < 0:
                        raise ValueError("amount_time amount must be non-negative.")
                    parsed_time = datetime.fromisoformat(parts[1].strip().replace("Z", "+00:00"))
                    if parsed_time.tzinfo is None:
                        raise ValueError("amount_time timestamp must include a timezone offset.")
                    self.clue_value = f"{amount:.2f}|{to_utc(parsed_time).isoformat()}"
                else:
                    self.clue_value = value
        return self


class CaseRead(CaseBase):
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
        evidence_types=payload.evidence_types or ([payload.evidence_type] if payload.evidence_type else []),
        clue_type=payload.clue_type,
        clue_value=payload.clue_value,
        incident_date=payload.incident_date,
        incident_end_date=payload.incident_end_date,
        incident_start_time=to_utc(payload.incident_start_time) if payload.incident_start_time else None,
        incident_end_time=to_utc(payload.incident_end_time) if payload.incident_end_time else None,
        event_description=payload.event_description,
        event_location=payload.event_location,
        event_lat=payload.event_lat,
        event_lng=payload.event_lng,
        event_radius_m=payload.event_radius_m,
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
    return _serialize(case, await _counts(db, case.id))


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


class CandidateConfirm(BaseModel):
    candidate_id: str


@router.get("/cases/{case_id}/candidates")
async def get_candidates(case_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    case = await db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    return await discover_candidates(case, db)


@router.post("/cases/{case_id}/candidates/confirm")
async def confirm_case_candidate(case_id: str, payload: CandidateConfirm, db: AsyncSession = Depends(get_db)) -> dict:
    case = await db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    try:
        candidate = await confirm_candidate(case, payload.candidate_id, db)
    except CandidateError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return {"candidate": candidate, "investigation_mode": case.investigation_mode, "seed_type": case.seed_type, "seed_value": case.seed_value}


async def _counts(db: AsyncSession, case_id: str) -> dict[str, int]:
    counts = {}
    for key, model in (("cdr", CdrRecord), ("ipdr", IpdrRecord), ("banking", BankingRecord), ("social", SocialRecord), ("evidence", EvidenceRecordRow)):
        counts[key] = int(await db.scalar(select(func.count()).select_from(model).where(model.case_id == case_id)) or 0)
    counts["entities"] = counts["cdr"] * 2 + counts["ipdr"] * 2 + counts["social"] * 2 + counts["banking"] * 2
    case = await db.get(Case, case_id)
    if case and case.seed_value:
        counts["entities"] += 1
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
    cases_by_id = {case.id: case for case in await db.scalars(select(Case).where(Case.id.in_(case_ids)))}
    for case_id, case_counts in counts.items():
        case = cases_by_id[case_id]
        if case.seed_value:
            case_counts["entities"] += 1
        case_counts["alerts"] = int(case_counts["banking"] > 0) + int(case_counts["evidence"] > 0)
    return counts


def _serialize(case: Case, counts: dict[str, int]) -> dict:
    return {
        "id": case.id, "name": case.name, "title": case.name, "created_at": case.created_at,
        "case_type": case.case_type, "description": case.description,
        "investigation_mode": case.investigation_mode, "seed_type": case.seed_type,
        "seed_value": case.seed_value, "evidence_type": case.evidence_type,
        "evidence_types": case.evidence_types or [], "incident_date": case.incident_date,
        "clue_type": case.clue_type, "clue_value": case.clue_value,
        "incident_end_date": case.incident_end_date, "incident_start_time": case.incident_start_time,
        "incident_end_time": case.incident_end_time, "event_description": case.event_description,
        "event_location": case.event_location, "event_lat": case.event_lat,
        "event_lng": case.event_lng, "event_radius_m": case.event_radius_m,
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
