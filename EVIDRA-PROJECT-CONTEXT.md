# EVIDRA Project Context

## Prompt 13: Case creation basics and navbar readability

Branch: `feature/case-creation-basics-and-navbar-fix`

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

Verification completed locally against SQLite:

- minimal case creation still succeeds with active status, medium priority,
  and unassigned lead defaults;
- structured entity and event case fields persist through POST and GET;
- frontend `npx tsc --noEmit` passed;
- frontend `npm run build` passed;
- browser screenshots confirmed the readable case title in the case-detail
  navbar and the updated case-creation fields on the dashboard.

The backend test suite remains environment-dependent in this workspace:
8 tests failed and 4 passed because tests requiring a running port 8000 or
live Neon/Postgres were connection-refused. No Render or Neon verification
was performed.

Status: branch is unpushed and awaiting review. Generated local verification
artifacts remain in the working tree because deletion was not authorized.
