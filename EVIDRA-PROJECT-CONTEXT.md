# EVIDRA Project Context

## Prompt 13: Case creation basics and navbar readability

Merged feature: `feature/case-creation-basics-and-navbar-fix`

Added structured case-creation fields to both the dashboard quick-start flow
and the dedicated New Case form:

- case type
- brief description
- priority
- investigation mode
- entity seed type/value
- expected evidence type
- incident date and event description

The backend stores these fields on `cases` and returns them from the case
create and read endpoints. Migration `0004_add_case_investigation_details`
adds the columns. The mode-specific values are stored as structured case
metadata; they do not create graph seed nodes or trigger ingestion.

The navbar now resolves the current case ID to its readable case name, with a
`Case #<id>` fallback while loading or when lookup fails.

Local verification completed against SQLite:

- minimal case creation still succeeds with active status, medium priority,
  and unassigned lead defaults;
- structured entity and event case fields persist through POST and GET;
- frontend `npx tsc --noEmit` passed;
- frontend `npm run build` passed;
- browser screenshots confirmed the readable case title in the case-detail
  navbar and the updated case-creation fields on the dashboard.

Live verification completed against Render + Neon on 2026-09-08:

- migration 0004 was manually applied and confirmed by the owner through
  Neon `information_schema.columns` verification;
- `https://evidra-f279.onrender.com/docs` returned HTTP 200;
- live login returned a bearer token and `GET /cases` returned 41 existing
  Neon-backed cases before verification cases were added;
- entity-led and event-led cases were created and read back with all
  structured fields persisted;
- live CDR and Banking ingestion succeeded with HTTP 201;
- dashboard summary, overview, graph, timeline, financial, evidence, story,
  evidence detail, story validation, copilot, PDF report, and audit endpoints
  returned successful live responses;
- story claims and graph/timeline/financial records carried matching evidence
  identifiers;
- local frontend development server configured with
  `NEXT_PUBLIC_API_BASE=https://evidra-f279.onrender.com` successfully created
  cases through both forms, and screenshots confirmed readable case names in
  the navbar instead of UUIDs.

The browser frontend was verified as a local build pointed at the live Render
API; `https://evidra-f279.onrender.com` itself is the backend service and
serves API/docs rather than the Next.js frontend.

The backend pytest suite remains environment-dependent locally. Neon-dependent
tests cannot be run from this machine because outbound Neon TCP access is
blocked. The live HTTP checks above are the current Render/Neon evidence.

Status: feature is live-verified against Render + Neon. Generated local
verification artifacts remain in the working tree because deletion was not
authorized.
