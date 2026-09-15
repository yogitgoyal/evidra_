# EVIDRA Project Context

Verified against this repository on 2026-09-14. This document describes the code in the current checkout and separates source-verified behavior from gaps and historical verification notes.

## 1. Project Overview

EVIDRA is an investigation workbench for combining telecom, network, banking, social, identity, and FIR/report evidence for a case. It stores source records in a relational database, derives evidence/provenance records, constructs investigation graph and timeline responses, exposes financial-flow and geospatial views, and presents the results in a Next.js command-center interface.

The represented target user is an analyst/officer. The main workflow is: authenticate, open or create a case, add or upload evidence, inspect evidence and provenance, review graph/timeline/financial/geo views, query the rule-based Copilot, generate a story, and download a composite PDF report.

The repository contains synthetic/demo data and a demo-seed endpoint. It is not evidence that the project is connected to real investigative data. Private environment files exist in the workspace, but their values are intentionally excluded.

## 2. Current Implementation Status

| Module/Feature | Status | Evidence from Code | Important Notes |
|---|---|---|---|
| Authentication/login | Implemented | `backend/app/routes/auth.py`, `backend/app/auth.py`, `frontend/app/login/page.tsx` | Credential login returns a bearer token; protected routes use `require_officer`. |
| Demo credentials | Implemented | `backend/app/auth.py`, `backend/.env.example`, login page | Defaults are explicitly demo values (`demo` / `evidra-demo`); deployment values come from environment variables. |
| MFA | Planned | Login UI contains an MFA step type, but the page stays on credentials and backend has no MFA endpoint | No second-factor verification is implemented. |
| SSO | Planned | Login UI has an SSO option, but no provider integration or backend route exists | Current UI behavior is a simulated redirect. |
| Command Center/dashboard | Implemented | `backend/app/main.py`, `store.dashboard_for_user`, `frontend/app/(app)/dashboard/page.tsx` | Database-backed summary, cases, alerts, and activity are wired. |
| Case management | Implemented | `backend/app/routes/cases.py`, `frontend/app/(app)/case/new/page.tsx` | Create/list/read/delete and structured investigation fields are persisted. |
| CDR evidence | Implemented | `routes/cdr.py`, `routes/bulk_ingest.py`, CDR page | Manual and CSV/XLSX ingestion, provenance, and retained original upload bytes are present. |
| Banking evidence | Implemented | `routes/banking.py`, `routes/bulk_ingest.py`, banking page | Manual and file/paste bulk ingestion; upload batches retain source files. |
| Social evidence | Implemented | `routes/social.py`, `routes/bulk_ingest.py`, social page | Manual and file/paste bulk ingestion; upload batches retain source files. |
| IPDR evidence | Implemented | `routes/ipdr.py`, `routes/bulk_ingest.py`, IPDR page | Manual and file/paste bulk ingestion validates IPv4/IPv6 addresses. |
| Identity evidence | Partially implemented | `routes/identity.py`, identity page | Manual POST/list GET only; no identity bulk ingestion was found. |
| FIR/report evidence | Implemented | `routes/reports.py`, file extractors, reports page | Pasted text and PDF/DOCX upload are supported. |
| Entity extraction | Implemented | `report_extractor.py` | Regex/heuristic extraction, not a full NLP or entity-resolution system. |
| Case graph | Implemented | `store.graph_for_case`, graph page, `InvestigationGraph` | Typed entities, observed links, possible identifier matches, evidence IDs, and filtering are present. |
| Timeline | Implemented | `store.timeline_for_case`, timeline page | Paginated reconstructed events with evidence identifiers. |
| Financial flow | Implemented | `store.financial_for_case`, financial page, Sankey/flow components | Banking records produce flow graph and ledger data. |
| Geospatial view | Implemented | `store.geo_for_case`, map page | Uses CDR attributes containing latitude/longitude when available. |
| Copilot | Partially implemented | `/copilot/query`, `store.copilot_for_case`, Copilot page | Rule-based evidence query is implemented; optional OpenAI narration is separate and environment-dependent. |
| Story/narrative generation | Implemented | `store.story_for_case`, story page, validation route | Deterministic narrative fallback exists; optional OpenAI-backed narration may be used. |
| PDF report generation | Implemented | `reports.py`, `/cases/{case_id}/report.pdf`, report page | Backend uses ReportLab and includes investigation outputs/provenance. |
| Audit log | Implemented | `models/audit.py`, audit route, write paths | Case deletion preserves audit rows by nulling `case_id`. |
| Bulk CSV/XLSX upload | Implemented | `routes/bulk_ingest.py`, extractors, dataset pages | CDR supports CSV/XLSX extraction; other bulk routes parse tabular uploads and return per-row rejection details. |
| Sample/demo data | Implemented | `backend/sample_data`, `/cases/demo-seed`, `scripts/ingest_datasets.py` | Synthetic sample CSVs and a one-click synthetic investigation are present. |
| Alerts | Implemented | Dashboard store logic and `GET /dashboard/alerts` | Current alerts are derived dashboard items, not a separate alert model/workflow. |
| Search | Partially implemented | Dashboard case filtering and evidence text/date UI exist | Global search control in `TopBar` has no verified backend search workflow. |
| Database integration | Implemented | SQLAlchemy async setup, models, Alembic migrations | Supports SQLite/aiosqlite and PostgreSQL/asyncpg URL normalization. |
| Frontend-backend communication | Implemented | `frontend/lib/api.ts`, FastAPI routes | Fetch client uses `NEXT_PUBLIC_API_BASE` and a session-storage bearer token. |

## 3. Complete Folder and File Structure

```text
Evidra/
|-- EVIDRA-PROJECT-CONTEXT.md       This handoff document
|-- PHASE4_BASELINE.md              Historical verification notes
|-- PHASE4_PASS1.md                 Historical local verification
|-- PHASE4_PASS2.md                 Historical follow-up and limitations
|-- WIRING_REPORT.md                Historical frontend/backend wiring notes
|-- SAMPLE_CASE_GROUND_TRUTH.md     Synthetic dataset patterns
|-- phase4_bulk_*.csv               Verification upload fixtures
|-- pyrightconfig.json              Root Python type-check configuration
|-- backend/
|   |-- .env.example                Safe environment template
|   |-- requirements.txt            Python dependencies
|   |-- alembic.ini                 Migration configuration
|   |-- app/
|   |   |-- main.py                 FastAPI application and composite routes
|   |   |-- auth.py                 Token and demo credential helpers
|   |   |-- db.py                   Async SQLAlchemy engine/session setup
|   |   |-- deps.py                 Database dependency
|   |   |-- store.py                Investigation aggregation and analysis logic
|   |   |-- reports.py               JSON/PDF report assembly
|   |   |-- report_extractor.py      Report entity extraction
|   |   |-- report_file_extractors.py PDF/DOCX text extraction
|   |   |-- cdr_file_extractors.py   CDR tabular file extraction
|   |   |-- models/                  SQLAlchemy and Pydantic models
|   |   |-- routes/                  Auth, case, dataset, bulk, and report routers
|   |-- migrations/                  Alembic environment and revisions 0001-0012
|   |-- data/                       CSVs used by the ingestion script
|   |-- sample_data/                Synthetic demo-seed CSVs
|   |-- scripts/ingest_datasets.py  Existing-dataset bulk importer
|   |-- tests/                      Backend tests and FIR fixtures
|-- frontend/
    |-- package.json                Next.js scripts and dependencies
    |-- app/                        App Router pages and layouts
    |-- components/                 Case, dashboard, evidence, graph, financial, landing, layout, timeline, UI
    |-- lib/api.ts                  Central backend API client
    |-- lib/types.ts                Shared frontend response types
    |-- lib/data.ts                 Legacy/mock structures still present
    |-- scripts/start-next.mjs      Development Next.js startup helper
    |-- globals.css, next.config.ts, postcss.config.mjs, tsconfig.json
```

The backend owns persistence and analysis. The frontend owns pages, navigation, forms, visualization, and calls to the backend API. `frontend/PROGRESS.md` is stale and should not be used as the current feature inventory.

## 4. Technology Stack

| Area | Verified technology |
|---|---|
| Frontend | Next.js 16.3.2 App Router, React 19.2.8, TypeScript 5 |
| Backend | Python, FastAPI, Uvicorn, Pydantic |
| Database | Configurable SQLite or PostgreSQL; async drivers are `aiosqlite` and `asyncpg` |
| ORM | SQLAlchemy 2 async ORM |
| Migrations | Alembic |
| Authentication | Custom HMAC-SHA256 JWT-shaped bearer tokens plus bcrypt password verification |
| API style | JSON REST-like HTTP endpoints; multipart upload endpoints for files |
| Styling/UI | Tailwind CSS v4/PostCSS, project CSS, Framer Motion, lucide-react |
| Graph/visualization | Cytoscape, cytoscape-cola/fcose, react-force-graph, d3-force, Recharts, d3-sankey, Leaflet, Three.js |
| Reporting | Python ReportLab PDF generation; `jspdf` is also a frontend dependency |
| Parsing | `pypdf`, `python-docx`, `openpyxl`, and Python CSV |
| AI integration | Optional OpenAI-compatible narration with deterministic fallback |
| Testing/tooling | pytest/pytest-asyncio in test configuration, ESLint 9, TypeScript compiler, Next build, Pyright configuration |

## 5. Frontend Details

| Route | Purpose and main implementation | Backend calls | Status |
|---|---|---|---|
| `/` | Landing page from `components/landing/*` | None required | Implemented |
| `/login` | Credential login; stores bearer token in `sessionStorage` | `POST /auth/login`, `GET /auth/me` | Implemented; MFA/SSO are not real |
| `/forgot-password` | Password recovery presentation | No verified reset API | Partially implemented |
| `/dashboard` | Command Center metrics, cases, alerts, activity, case creation/search/filter UI | `/dashboard`, `/cases`, `POST /cases`, delete case | Implemented |
| `/case/new` | Dedicated structured case form | `POST /cases` | Implemented |
| `/case/[id]` | Case overview, risk, story, evidence summary | case, overview, graph, risk, timeline, story, evidence APIs | Implemented |
| `/case/[id]/data` | CDR data entry/list and bulk upload | CDR routes | Implemented |
| `/case/[id]/banking` | Banking entry/list and bulk upload | Banking routes | Implemented |
| `/case/[id]/social` | Social entry/list and bulk upload | Social routes | Implemented |
| `/case/[id]/ipdr` | IPDR entry/list and bulk upload | IPDR routes | Implemented |
| `/case/[id]/identity` | Identity entry/list | Identity routes | Implemented, manual-only |
| `/case/[id]/reports` | Pasted report and PDF/DOCX submission/list | Report POST/file/list routes | Implemented |
| `/case/[id]/evidence` | Filterable/paginated evidence viewer and provenance/file access | Evidence, provenance, audit, file routes | Implemented |
| `/case/[id]/graph` | Interactive investigation graph | `GET /cases/{id}/graph` | Implemented |
| `/case/[id]/timeline` | Reconstructed event timeline | `GET /cases/{id}/timeline` | Implemented |
| `/case/[id]/financial` | Financial flow graph and ledger | `GET /cases/{id}/financial` | Implemented |
| `/case/[id]/map` | CDR-derived location map | `GET /cases/{id}/geo` | Implemented |
| `/case/[id]/copilot` | Query evidence and display cited claims | Copilot seed/query routes | Partially implemented: rule-based |
| `/case/[id]/report` | Composite report view and download | Report JSON/PDF routes | Implemented |

Important reusable components include `Sidebar`, `TopBar`, `CaseHeader`, dashboard stat/case/activity/alert components, `EvidenceProvider`, `Cite`, `InvestigationGraph`, `FinancialFlowGraph`, `SankeyFlow`, `StoryMode`, `RiskRadarChart`, `RiskGauge`, `TimelineSparkline`, and shared UI primitives.

The API client is `frontend/lib/api.ts`. It defaults to `http://127.0.0.1:8000` and accepts `NEXT_PUBLIC_API_BASE`. It attaches `Authorization: Bearer ...` from `sessionStorage` to browser requests. Pages contain loading, error, empty, and upload-result states in varying detail; the app shell has a shared loading route. No Next.js middleware or server-side authorization guard was found.

## 6. Backend Details

`backend/app/main.py` creates the FastAPI application, loads dotenv configuration, registers routers, configures CORS, and defines dashboard, graph, risk, timeline, overview, evidence, geo, financial, Copilot, story, audit, report, and file-download endpoints. `get_db` supplies an async SQLAlchemy session. `store.py` performs the main aggregation and analysis work.

All endpoints below require a bearer token unless marked public. The `/auth` router is public for login, while `/auth/me` requires a bearer token.

| API Method | Endpoint | Purpose | Request Data | Response | Status |
|---|---|---|---|---|---|
| POST | `/auth/login` | Authenticate configured user | JSON username/password | bearer token | Implemented/public |
| GET | `/auth/me` | Return token subject and role | Bearer token | identity JSON | Implemented |
| GET | `/dashboard`, `/dashboard/summary`, `/dashboard/cases`, `/dashboard/alerts`, `/dashboard/activity` | Dashboard payload/sections | None | JSON dashboard data | Implemented |
| POST | `/cases` | Create case | JSON case fields | Case summary | Implemented |
| GET | `/cases`, `/cases/{case_id}` | List/read cases | Path for read | Case summaries | Implemented |
| DELETE | `/cases/{case_id}` | Delete case | Path | 204 | Implemented; audit history preserved |
| POST | `/cases/demo-seed` | Create synthetic case and load sample CDR/banking/social | None | Case ID and counts | Implemented |
| POST/GET | `/cases/{case_id}/cdr` | Manual CDR create/list | JSON caller/callee/duration/time | CDR record/list | Implemented |
| POST/GET | `/cases/{case_id}/banking` | Manual banking create/list | JSON sender/recipient/amount/channel/time | Banking record/list | Implemented |
| POST/GET | `/cases/{case_id}/social` | Manual social create/list | JSON actor/target/platform/interaction/time | Social record/list | Implemented |
| POST/GET | `/cases/{case_id}/ipdr` | Manual IPDR create/list | JSON source/destination IP/protocol/time | IPDR record/list | Implemented |
| POST/GET | `/cases/{case_id}/identity` | Manual identity create/list | JSON subject/document type/hash/time | Identity record/list | Implemented |
| POST | `/cases/{case_id}/cdr/bulk` | Upload CDR file | Multipart file | counts, rejected rows, IDs, hash | Implemented |
| POST | `/cases/{case_id}/banking/bulk` | Upload/paste banking data | Multipart file and optional source type | counts, batch metadata | Implemented |
| POST | `/cases/{case_id}/social/bulk` | Upload/paste social data | Multipart file and optional source type | counts, batch metadata | Implemented |
| POST | `/cases/{case_id}/ipdr/bulk` | Upload/paste IPDR data | Multipart file and optional source type | counts, batch metadata | Implemented |
| GET | `/cases/{case_id}/{banking,social,ipdr}/bulk-uploads/{batch_id}/file` | Retrieve retained source upload | Path | Original file bytes | Implemented |
| GET | `/cases/{case_id}/overview` | Case metrics | Path | Overview JSON | Implemented |
| GET | `/cases/{case_id}/graph` | Build investigation graph | Path | Entities, edges, fraud metrics | Implemented |
| GET | `/cases/{case_id}/risk-factors` | Calculate risk factors | Path | Risk factors | Implemented |
| GET | `/cases/{case_id}/timeline` | Build paginated timeline | `limit`, `offset` query | Timeline events | Implemented |
| GET | `/cases/{case_id}/financial` | Build financial flow | Path | Nodes, links, ledger data | Implemented |
| GET | `/cases/{case_id}/geo` | Return location events | Path | Geo events | Implemented |
| GET | `/cases/{case_id}/evidence` | Filter/page evidence | `limit`, `offset`, `from`, `to` | Evidence plus `hasMore` | Implemented |
| GET | `/cases/{case_id}/evidence/{evidence_id}` | Evidence detail | Path | Detail and provenance/file metadata | Implemented |
| GET | `/cases/{case_id}/evidence/{evidence_id}/file` | Download original evidence file | Path | File stream | Implemented |
| GET | `/evidence/{claim_id}` | Retrieve provenance chain | Path | Provenance JSON | Implemented |
| GET | `/cases/{case_id}/audit` | Retrieve audit records | Optional `entity_id` | Audit entries | Implemented |
| GET | `/cases/{case_id}/copilot` | Seed/return Copilot messages | Path | Messages | Implemented |
| POST/GET | `/copilot/query` | Query evidence | JSON or query parameters | Cited claims | Implemented, rule-based |
| GET/POST | `/cases/{case_id}/investigate` | Dispatch investigation mode | Query/body as defined in `main.py` | Mode-specific data | Implemented |
| GET | `/cases/{case_id}/investigate_all` | Combined investigation response | Path | Combined JSON | Implemented |
| POST/GET | `/cases/{case_id}/reports` | Submit/list report text | JSON raw text | Report records | Implemented |
| POST | `/cases/{case_id}/reports/file` | Submit PDF/DOCX report | Multipart file and optional text | Report record/entities | Implemented |
| GET | `/cases/{case_id}/report` | Build composite report JSON | Path | Report JSON | Implemented |
| GET | `/cases/{case_id}/report.pdf` | Generate PDF | Path | PDF stream | Implemented |

Error handling uses FastAPI/Pydantic validation and explicit `HTTPException` responses for missing cases, invalid credentials, unsupported report files, invalid IPs, empty reports, and missing original files. CORS defaults to local ports and can be overridden by `EVIDRA_CORS_ORIGINS`. No background queue, WebSocket, or streaming analysis service was found.

## 7. Database Details

`backend/app/db.py` reads `DATABASE_URL`, converts SQLite URLs to `sqlite+aiosqlite`, converts PostgreSQL URLs to `postgresql+asyncpg`, and normalizes `sslmode=require` to the asyncpg `ssl` query option. SQLAlchemy models use the `Base` declarative class and async sessions.

Important tables and relationships:

- `cases`: case identity, name, investigation metadata, status, priority, lead, tags, and creation time.
- `cdr_records`, `ipdr_records`, `banking_records`, `social_records`, `identity_records`: case-linked source records with timestamps and JSON attributes.
- `report_records`: raw report text, submitter, extracted entities, and optional original PDF/DOCX bytes.
- `evidence_records`: source, source record, transformation/rule, content hash, fields, and timestamp.
- `audit_log_entries`: actor, action, entity, details, and nullable `case_id` with `ON DELETE SET NULL`.
- `banking_upload_batches`, `social_upload_batches`, `ipdr_upload_batches`: retained original bulk upload bytes and metadata.

Case-linked records use foreign keys to `cases.id` and indexed `case_id` columns. The migration chain is `0001` through `0012`: initial cases/datasets, evidence, structured case fields, audit logs, reports, report/CDR blobs, banking/social/IPDR upload batches, and audit preservation on case delete.

Migration caveats visible in the repository: `0001` and `0002` overlap in dataset-table creation for compatibility, `0002` has a no-op downgrade, and `migrations/env.py` explicitly imports only some model classes before assigning target metadata. Use migrations rather than assuming `Base.metadata.create_all()` is the deployment process.

The ingestion script `backend/scripts/ingest_datasets.py` reads `backend/data/*.csv`, creates missing cases, avoids duplicate record IDs, and imports CDR, IPDR, banking, social, and identity data. The demo endpoint instead uses `backend/sample_data/cdr.csv`, `banking.csv`, and `social.csv`.

## 8. Environment Configuration

| Variable | Required? | Purpose | Example/Safe Placeholder |
|---|---|---|---|
| `DATABASE_URL` | Required for database-backed API | Async SQLite or PostgreSQL connection | `DATABASE_URL=<configured privately>` |
| `SECRET_KEY` | Required for secure deployment | HMAC token signing key | `<keep-private>` |
| `DEMO_USERNAME` | Optional; default exists | Login username | `demo` |
| `DEMO_PASSWORD` | Optional; default exists; change outside demo | Login password | `<keep-private>` |
| `EVIDRA_CORS_ORIGINS` | Optional | Comma-separated allowed frontend origins | `http://localhost:3000` |
| `OPENAI_API_KEY` | Optional | OpenAI-compatible narrative provider | `<keep-private>` |
| `OPENAI_MODEL` | Optional | Narration model; code defaults to `gpt-4o-mini` | `<model-name>` |
| `OPENAI_BASE_URL` | Optional | OpenAI-compatible endpoint override | `<configured privately>` |
| `EVIDRA_DEMO_MODE` | Optional | Legacy in-memory dashboard fallback path | `false` |
| `NEXT_PUBLIC_API_BASE` | Optional frontend variable | Backend base URL; defaults to `http://127.0.0.1:8000` | `http://127.0.0.1:8000` |
| `PORT` | Optional frontend/start helper variable | Frontend development port | `3000` |

Create `backend/.env` from `backend/.env.example`. The frontend can use `frontend/.env.local` for `NEXT_PUBLIC_API_BASE`. A configured database URL is required for the backend to create `SessionLocal`; local login/dashboard require the backend API and database to be available.

## 9. How to Run the Project Locally

These commands are supported by the package scripts and README. They assume PowerShell and a Python virtual environment at `backend\venv`.

### Backend terminal

```powershell
cd C:\Users\DELL\OneDrive\Desktop\Evidra\backend
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
# Create backend\.env from backend\.env.example and configure DATABASE_URL and SECRET_KEY.
venv\Scripts\python.exe -m alembic upgrade head
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

The API is at `http://127.0.0.1:8000`; FastAPI docs are at `http://127.0.0.1:8000/docs`. The migration command is configured by `alembic.ini` but was not rerun during this update. The sample importer is:

```powershell
cd C:\Users\DELL\OneDrive\Desktop\Evidra\backend
venv\Scripts\python.exe scripts\ingest_datasets.py
```

The one-click synthetic case is an authenticated `POST /cases/demo-seed`; it loads `backend/sample_data`.

### Frontend terminal

```powershell
cd C:\Users\DELL\OneDrive\Desktop\Evidra\frontend
npm install
# Optional: set NEXT_PUBLIC_API_BASE in frontend\.env.local
npm run dev
```

The frontend is at `http://localhost:3000`. `npm run dev` starts Next.js and the API according to `package.json` (`npm run next` and the Windows `venv\Scripts\python.exe` API command). For production use:

```powershell
npm run build
npm run start
```

## 10. Demo Login and Demo Data

The code explicitly provides demo defaults: username `demo`, password `evidra-demo`. These are intended for local/demo use and must not be treated as production credentials. Environment variables override them.

Demo data sources are `POST /cases/demo-seed`, `backend/data/*.csv` for `scripts/ingest_datasets.py`, `backend/sample_data/*.csv`, `backend/tests/fixtures/*.txt`, and the root `phase4_bulk_*.csv` verification fixtures. Historical phase documents report a synthetic seed of 120 CDR, 120 banking, and 120 social rows, but those counts were not freshly rerun for this update. The sample identifiers are fictional and no real data should be inferred.

## 11. Git and Development Progress

Current Git state:

- Branch: `main`.
- HEAD: `359bbab`, also `origin/main` and `origin/HEAD`.
- Visible remote branches: `origin/bugfix/dashboard-seed-data-mixing`, `origin/feature/digital-timeline-fix`, `origin/feature/fir-report-ingestion`, and `origin/main`.
- The worktree had a generated `frontend/next-env.d.ts` modification after the verification build; this context task did not alter or revert it.

Recent commits:

- `359bbab`: redirect landing-page “Enter Command Center” CTAs to `/login`.
- `743d363`: fix report-only evidence narrative and empty-case PDF fallback.
- `eb982b2`: pre-fill/display demo login credentials.
- `41b93e5`: batch story provenance queries and correct overview evidence count.
- `3e25e54`: merge dashboard and case deletion fixes.
- `b24fc78`: preserve audit history on case deletion, including migration/model/route changes.
- `eefa98e`: wire live dashboard activity chart.
- `35b280a`: add dashboard loading state.
- `37d579f`: add client-side case search and status/priority filters.
- `6b2594a`: fix evidence visibility, original-file download, provenance, source navigation, audit trail, and filters/pagination.

The feature branches are visible remotely, but their complete contents are not necessarily in current `main`; do not infer branch-specific behavior from names alone.

## 12. Known Issues and Errors

| Issue | File/location | Why it happens | Current impact | Suggested next action |
|---|---|---|---|---|
| Frontend lint fails | `frontend/app/(app)/case/[id]/ipdr/page.tsx`, `reports/page.tsx` | ESLint `react-hooks/set-state-in-effect` reports two errors | `npm run lint` exits 1 although build succeeds | Refactor those effects and rerun lint. |
| Frontend lint warnings remain | Dataset/graph/new-case files and `InvestigationGraph.tsx` | Missing hook dependencies and unused caught errors | No build failure, but hook behavior may be fragile | Resolve warnings with focused tests. |
| Backend tests could not run in this shell | `backend/tests/*` | `pytest` was not recognized in PowerShell; some tests also expect PostgreSQL/API setup | No current backend test result can be claimed | Install/use the intended venv, configure DB, rerun `pytest -v`. |
| No production auth user/role model | `auth.py`, `routes/auth.py` | Authentication compares one configured demo credential pair | No multi-user administration or durable roles | Add a designed user/role model before production use. |
| MFA/SSO/password reset absent | Login and forgot-password pages | UI surfaces exist without matching provider/API implementation | Users cannot complete real MFA, SSO, or reset flows | Remove misleading controls or implement the flows. |
| No server-side frontend route guard | `frontend/lib/api.ts`, app routes | Token is held in browser session storage and pages call APIs client-side | Unauthenticated navigation is not centrally blocked | Choose a session strategy, then add middleware/server auth. |
| Identity bulk ingestion absent | `routes/identity.py`, identity page | Only manual create/list routes exist | Identity cannot use other datasets' bulk workflow | Add schema, route, retained-file behavior, UI, and tests. |
| Report co-occurrence edges are limited | `store.py`, `PHASE4_PASS2.md` | Report entities become nodes, but same-report co-occurrence is not generally an edge | Report-derived graph relationships can be incomplete | Define confidence semantics and add edges/tests. |
| Graph layout is synchronous | `frontend/components/graph/InvestigationGraph.tsx` | Layout runs in the browser during graph changes | Large graphs may block the UI | Measure real cases; consider worker/async layout. |
| Legacy mock/demo structures remain | `frontend/lib/data.ts`, `backend/app/seed.py` | Older scaffolding was not removed | Can confuse maintenance; live paths use APIs | Remove or label legacy data after checking consumers. |
| Migration metadata has compatibility caveats | `migrations/env.py`, revisions 0001/0002 | Dataset creation overlaps and model imports are incomplete for generic metadata | Fresh/altered databases need careful migration verification | Test `alembic upgrade head` on each supported DB. |
| OpenAI narration is optional | `store.py`, environment config | Provider call requires private key/configuration | Story works through deterministic fallback; quality differs | Keep fallback tested and document provider behavior. |

No source `TODO`, `FIXME`, or `NotImplemented` markers were found in the inspected application code. `backend/app/seed.py` contains legacy skeleton/paste-data material, and `frontend/PROGRESS.md` is stale; these are legacy/documentation risks rather than proof of missing current routes.

## 13. Testing and Verification

Backend tests are `test_dashboard_seed_mixing.py`, `test_e2e.py`, `test_graph_entity_ids.py`, and `test_report_extractor.py`, with three FIR fixtures. Available frontend commands are `npx tsc --noEmit`, `npm run lint`, and `npm run build`; backend is `venv\Scripts\python.exe -m pytest -v`.

Verification performed for this document:

- `npx tsc --noEmit`: passed with no output.
- `npm run build`: passed with Next.js 16.3.2 and produced all listed App Router routes.
- `npm run lint`: failed with 2 errors and 14 warnings, specifically the current IPDR/reports effect errors plus hook/unused-variable warnings.
- `pytest -v`: not run successfully because `pytest` was not recognized in the current PowerShell environment.
- No fresh API/database seed run was performed during this update.

Historical `PHASE4_PASS1.md` and `PHASE4_PASS2.md` contain SQLite/demo-seed, bulk-ingestion, graph, Copilot, and live-API verification records. They are dated evidence, not a substitute for rerunning checks after code changes.

## 14. Project Workflow

```text
Login
  -> Command Center
  -> Create or select case
  -> Add manual evidence or upload CDR/banking/social/IPDR data
  -> Submit FIR/report text or PDF/DOCX
  -> Persist evidence and provenance records
  -> Inspect evidence, audit trail, and original files
  -> Build graph, timeline, financial flow, and optional geo view
  -> Query rule-based Copilot
  -> Review generated story and validate cited narrative
  -> Build/download composite PDF report
```

Identity is available for manual records. Real MFA, SSO, password recovery, global search, and identity bulk upload are not supported workflow steps. Case investigation mode fields are persisted as metadata; they do not themselves create graph seed nodes or trigger ingestion.

## 15. Architecture Explanation

```text
Next.js App Router pages/components
        |
        | frontend/lib/api.ts + bearer token + NEXT_PUBLIC_API_BASE
        v
FastAPI application (app/main.py and app/routes/*)
        |
        +--> auth.py / deps.py
        +--> store.py: graph, timeline, financial, risk, story, Copilot, dashboard
        +--> report_extractor.py and file extractors
        +--> reports.py: composite JSON and ReportLab PDF
        v
SQLAlchemy async sessions (app/db.py)
        |
        v
SQLite/aiosqlite or PostgreSQL/asyncpg
        |
        +--> cases, dataset records, reports, evidence, upload batches, audit logs
```

Ingestion routes write source and provenance/evidence records. Aggregation functions query those records and derive frontend-oriented response shapes. The frontend does not directly access the database.

## 16. Recommended Next Steps

### Priority 1: Critical blockers

1. Fix the two ESLint errors in the IPDR and reports pages, then rerun lint and build.
2. Establish a reproducible backend test environment using the intended virtual environment and a supported database; run the existing suite and record actual failures.
3. Validate a clean `alembic upgrade head` on the intended database, including audit and upload-batch tables.

### Priority 2: Demo/presentation improvements

1. Remove or clearly label nonfunctional MFA, SSO, and password-reset controls.
2. Make global search, notifications, and settings either functional or visibly out of scope.
3. Add repeatable local demo-seed/API verification independent of deployment state.

### Priority 3: Backend/data improvements

1. Add identity bulk ingestion if required by the investigation workflow.
2. Decide and test confidence semantics for report co-occurrence graph edges.
3. Replace the single configured demo credential with a designed user/role system before production use.

### Priority 4: Testing and reliability

1. Add route tests for bulk formats, rejection behavior, retained-file download, report extraction, and audit preservation.
2. Add browser tests for login, case creation, upload, evidence provenance, graph/timeline/financial navigation, and PDF download.
3. Address hook warnings and measure graph layout performance with large synthetic cases.

### Priority 5: Future features

1. Implement real MFA/SSO/password recovery with an explicit identity/security design.
2. Add background processing for expensive extraction or graph layout if workloads require it.
3. Add CI and deployment configuration after local test and migration contracts are stable.

## 17. AI Agent Handoff Summary

## AI Agent Handoff

Current state: EVIDRA is a full-stack investigation prototype on `main`, with a Next.js frontend and FastAPI/SQLAlchemy backend. The checkout includes case management, multiple evidence types, provenance, graph/timeline/financial/geo analysis, Copilot queries, story generation, audit logging, and PDF reports.

Working and verified in this checkout: TypeScript check and Next production build. The source contains the routes and persistence needed for manual and bulk evidence flows. Historical phase documents record additional successful SQLite/live API checks.

Not currently verified in this update: backend tests, fresh migrations, fresh API startup, or a new demo-seed run. `npm run lint` currently fails with two errors and reports fourteen warnings.

Run commands: backend `venv\Scripts\python.exe -m alembic upgrade head` then `venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`; frontend `npm install` then `npm run dev`. Frontend URL is `http://localhost:3000`; API/docs URL is `http://127.0.0.1:8000/docs`.

Important files: `backend/app/main.py`, `backend/app/store.py`, `backend/app/routes/`, `backend/app/models/`, `backend/migrations/versions/`, `backend/sample_data/`, `frontend/lib/api.ts`, `frontend/app/`, and `frontend/components/`.

Current blockers: lint errors, unavailable pytest command/environment, incomplete migration/test verification, and prototype authentication. The safest next task is to fix the two lint errors and then establish a reproducible backend test run without changing application behavior.

AI agents must not expose or copy values from `backend/.env` or `frontend/.env.local`, change application code during a context-document-only task, assume stale progress notes are authoritative, claim live deployment success without a fresh check, or introduce authentication/database/migration changes without confirming the security and schema requirements.
