# backend/app/main.py
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import decode_access_token, require_officer
from app.deps import get_db
from app.models.audit import AuditLogEntry
from app.models.case import Case
from app.models.datasets import EvidenceRecordRow
from app.reports import REPORTS_DIR, build_report
from app.routes.auth import router as auth_router
from app.routes.banking import router as banking_router
from app.routes.bulk_ingest import router as bulk_ingest_router
from app.routes.cases import router as cases_router
from app.routes.cdr import router as cdr_router
from app.routes.identity import router as identity_router
from app.routes.ipdr import router as ipdr_router
from app.routes.reports import router as reports_router
from app.routes.social import router as social_router
from app.store import TIMELINE_MAX_EVENTS, store

load_dotenv()

app = FastAPI()
app.include_router(bulk_ingest_router, dependencies=[Depends(require_officer)])
app.include_router(cases_router, dependencies=[Depends(require_officer)])
app.include_router(cdr_router, dependencies=[Depends(require_officer)])
app.include_router(auth_router)
app.include_router(banking_router, dependencies=[Depends(require_officer)])
app.include_router(social_router, dependencies=[Depends(require_officer)])
app.include_router(ipdr_router, dependencies=[Depends(require_officer)])
app.include_router(identity_router, dependencies=[Depends(require_officer)])
app.include_router(reports_router, dependencies=[Depends(require_officer)])

class CopilotQuery(BaseModel):
    case_id: str
    query: str


class StoryValidationRequest(BaseModel):
    narrative: str


def _request_actor(request: Request) -> str:
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            return decode_access_token(token).get("sub", "system")
        except HTTPException:
            return "anonymous"
    return "system"


async def _log_audit_event(
    db: AsyncSession,
    case_id: str,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: str | None,
    details: dict | None = None,
) -> None:
    case = await db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    db.add(
        AuditLogEntry(
            case_id=case_id,
            user=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
        )
    )
    await db.commit()


CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "EVIDRA_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/dashboard", dependencies=[Depends(require_officer)])
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    return await store.dashboard_for_user(db)


@app.get("/dashboard/summary", dependencies=[Depends(require_officer)])
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    return (await store.dashboard_for_user(db))["summary"]


@app.get("/dashboard/cases", dependencies=[Depends(require_officer)])
def get_dashboard_cases():
    return store.cases_for_dashboard()


@app.get("/dashboard/alerts", dependencies=[Depends(require_officer)])
def get_dashboard_alerts():
    return store.alerts_for_dashboard()


@app.get("/dashboard/activity", dependencies=[Depends(require_officer)])
def get_dashboard_activity():
    return store.activity_for_dashboard()


@app.get("/cases/{case_id}/graph", dependencies=[Depends(require_officer)])
async def get_graph(case_id: str, db: AsyncSession = Depends(get_db)):
    return await store.graph_for_case(case_id, db)

@app.get("/cases/{case_id}/risk-factors", dependencies=[Depends(require_officer)])
async def get_risk_factors(case_id: str, db: AsyncSession = Depends(get_db)):
    return await store.risk_factors_for_case(case_id, db)

@app.get("/cases/{case_id}/timeline", dependencies=[Depends(require_officer)])
async def get_timeline(
    case_id: str,
    limit: int = Query(default=TIMELINE_MAX_EVENTS, ge=1, le=TIMELINE_MAX_EVENTS),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    return await store.timeline_for_case(case_id, db, limit=limit, offset=offset)

@app.get("/cases/{case_id}/overview", dependencies=[Depends(require_officer)])
async def get_overview(case_id: str, db: AsyncSession = Depends(get_db)):
    return await store.overview_for_case(case_id, db)

@app.get("/cases/{case_id}/evidence", dependencies=[Depends(require_officer)])
async def get_evidence_for_case(case_id: str, db: AsyncSession = Depends(get_db)):
    records = await store.evidence_for_case(case_id, db)
    return {
        "evidence": [
            {
                "id": item.id,
                "source": item.source,
                "summary": item.summary,
                "timestamp": item.timestamp,
                "ruleTriggered": item.ruleTriggered,
                "confidence": item.confidence,
            }
            for item in records
        ]
    }


@app.get("/cases/{case_id}/evidence/{evidence_id}", dependencies=[Depends(require_officer)])
async def get_evidence(case_id: str, evidence_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(select(EvidenceRecordRow).where(
        EvidenceRecordRow.case_id == case_id, EvidenceRecordRow.id == evidence_id
    ))
    if row is None:
        raise HTTPException(status_code=404, detail="Evidence not found.")
    actor = _request_actor(request)
    await _log_audit_event(
        db,
        case_id,
        actor,
        "evidence_viewed",
        "evidence",
        evidence_id,
        {"source": row.source, "source_record_id": row.source_record_id, "rule": row.rule},
    )
    return {
        "id": row.id, "source": row.source, "summary": f"{row.source} record {row.source_record_id}",
        "timestamp": row.timestamp.isoformat(), "hash": row.content_hash,
        "ingested": row.timestamp.isoformat(), "fields": row.fields, "ruleTriggered": row.rule,
    }


@app.get("/evidence/{claim_id}", dependencies=[Depends(require_officer)])
async def get_provenance(claim_id: str, db: AsyncSession = Depends(get_db)):
    result = await store.provenance_for_claim(claim_id, db)
    if not result["valid"]:
        raise HTTPException(status_code=404, detail="Evidence provenance not found or incomplete.")
    return result


@app.get("/cases/{case_id}/story", dependencies=[Depends(require_officer)])
async def get_story(case_id: str, db: AsyncSession = Depends(get_db)):
    return await store.story_claims_for_case(case_id, db)


@app.post("/cases/{case_id}/story/validate", dependencies=[Depends(require_officer)])
async def validate_story(case_id: str, payload: StoryValidationRequest, request: Request, db: AsyncSession = Depends(get_db)):
    rows = await store.story_claims_for_case(case_id, db)
    valid_ids = {
        evidence_id
        for claim in rows["claims"]
        for evidence_id in claim["evidenceIds"]
    }
    result = store._validate_narrative(payload.narrative, valid_ids)
    result["caseId"] = case_id
    await _log_audit_event(
        db,
        case_id,
        _request_actor(request),
        "story_validated",
        "narrative",
        None,
        {
            "narrative_preview": payload.narrative[:200],
            "provenance_verified": result.get("provenanceVerified", False),
            "claim_count": len(result.get("claims", [])),
        },
    )
    return result

@app.get("/cases/{case_id}/financial", dependencies=[Depends(require_officer)])
async def get_financial(case_id: str, db: AsyncSession = Depends(get_db)):
    return await store.financial_flow_for_case(case_id, db)

@app.get("/cases/{case_id}/geo", dependencies=[Depends(require_officer)])
async def get_geo(case_id: str, db: AsyncSession = Depends(get_db)):
    return await store.geo_for_case(case_id, db)

@app.get("/cases/{case_id}/copilot", dependencies=[Depends(require_officer)])
async def get_copilot(
    case_id: str,
    q: str | None = None,
    query: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query_text = q or query
    return await store.copilot_messages_for_case(case_id, query=query_text, db=db)


@app.post("/copilot/query", dependencies=[Depends(require_officer)])
async def query_copilot_post(payload: CopilotQuery, db: AsyncSession = Depends(get_db)):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty.")
    return await store.copilot_query(payload.case_id, payload.query, db)


@app.get("/copilot/query", dependencies=[Depends(require_officer)])
async def query_copilot_get(case_id: str, query: str, db: AsyncSession = Depends(get_db)):
    return await store.copilot_query(case_id, query, db)


@app.post("/cases/{case_id}/investigate", dependencies=[Depends(require_officer)])
async def investigate_post(case_id: str, mode: str, db: AsyncSession = Depends(get_db)):
    return await store.investigate(case_id, mode, db)


@app.get("/cases/{case_id}/investigate", dependencies=[Depends(require_officer)])
async def investigate_get(case_id: str, mode: str, db: AsyncSession = Depends(get_db)):
    return await store.investigate(case_id, mode, db)

@app.get("/cases/{case_id}/investigate_all", dependencies=[Depends(require_officer)])
async def investigate_all(case_id: str, db: AsyncSession = Depends(get_db)):
    return await store.investigate_all(case_id, db)


@app.get("/cases/{case_id}/report", dependencies=[Depends(require_officer)])
async def get_report(case_id: str, db: AsyncSession = Depends(get_db)):
    return await build_report(store, case_id, db)


@app.get("/cases/{case_id}/report.pdf", dependencies=[Depends(require_officer)])
async def download_report(case_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    await build_report(store, case_id, db)
    path = REPORTS_DIR / f"{case_id}.pdf"
    await _log_audit_event(
        db,
        case_id,
        _request_actor(request),
        "report_exported",
        "report",
        case_id,
        {"pdf_path": str(path), "filename": f"case-{case_id}-report.pdf"},
    )
    return FileResponse(path, media_type="application/pdf", filename=f"case-{case_id}-report.pdf")


@app.get("/cases/{case_id}/audit", dependencies=[Depends(require_officer)])
async def get_case_audit(case_id: str, db: AsyncSession = Depends(get_db)):
    entries = await db.scalars(
        select(AuditLogEntry)
        .where(AuditLogEntry.case_id == case_id)
        .order_by(AuditLogEntry.timestamp.desc(), AuditLogEntry.id.desc())
    )
    return [
        {
            "id": entry.id,
            "case_id": entry.case_id,
            "user": entry.user,
            "action": entry.action,
            "entity_type": entry.entity_type,
            "entity_id": entry.entity_id,
            "timestamp": entry.timestamp.isoformat(),
            "details": entry.details,
        }
        for entry in entries
    ]
