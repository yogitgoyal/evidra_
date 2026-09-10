# Phase 4 — Bulk ingestion and synthetic demo dataset

## Banking-to-graph prerequisite

Before this pass, `graph_for_case()` queried CDR, IPDR, and social records but
not `BankingRecord`. The prerequisite was fixed in
`backend/app/store.py`: banking rows now participate in the guard and
provenance generation, create account entities, and create
`TRANSFERRED_TO` edges. Fresh verification returned 120 banking graph edges
for the synthetic case.

## Baseline and non-regression evidence

The complete live Render baseline is recorded in `PHASE4_BASELINE.md`. It
covered authentication, case CRUD, single-row CDR/banking/social endpoints,
graph, timeline, financial, geo, story, evidence, copilot, report,
`investigate_all`, audit, and two distinct copilot queries. The baseline API
results were HTTP 200/201/204 with populated response shapes.

Frontend baseline results:

- `npx tsc --noEmit`: passed.
- `npm run lint`: baseline had one pre-existing `TopBar.tsx` error and 14
  warnings.
- `npm run build`: passed.

The navbar state reset was adjusted while adding the upload UI so the existing
lint error is gone without changing its readable-case fallback behavior.
Final frontend results are TypeScript passed, lint 0 errors/14 warnings, and
production build passed.

Two fresh, migrated SQLite passes were run and saved in
`PHASE4_PASS1.md` and `PHASE4_PASS2.md`. Both passes returned:

```text
demo-seed=120/120/120, rejected=0
GET /cases and all populated investigation endpoints => 200 nonempty=true
POST /copilot/query 'transfer' => 200 count=10
POST /copilot/query 'call' => 200 count=10
mixed bulk => created=20, rejected=3
graph banking edges=120
```

The repository migration chain does not create `audit_log_entries`; this is a
pre-existing fresh-database setup gap. For these two local passes only, the
already-defined SQLAlchemy models were used to create that missing table before
starting the API. The application audit endpoint itself returned 200 in both
passes. No migration was added for this unrelated gap.

## Bulk upload implementation

Added:

- `POST /cases/{case_id}/cdr/bulk`
- `POST /cases/{case_id}/banking/bulk`
- `POST /cases/{case_id}/social/bulk`

Each endpoint validates the case first, parses CSV with the standard library,
uses the existing dataset tables, rejects malformed rows individually, and
commits valid rows in one transaction. The response includes `created`,
`rejected` row/reason objects, and up to five `sample_ids`.

Real local API evidence:

```text
valid CDR upload => {"created":20,"rejected":[],"sample_ids":[...]}
mixed CDR upload => {"created":20,"rejected":[
  {"row":22,"reason":"Missing required field(s): caller"},
  {"row":23,"reason":"invalid literal for int() with base 10: 'not-a-number'"},
  {"row":24,"reason":"Invalid isoformat string: 'not-a-date'}
]}
CDR list after mixed upload => 20
banking sample upload => {"created":120,"rejected":[],"sample_ids":[...]}
social sample upload => {"created":120,"rejected":[],"sample_ids":[...]}
```

The frontend retains the existing single-row forms and adds a CSV chooser,
upload button, visible result counts, rejected-row reasons, and automatic list
refresh to the CDR, banking, and social pages. A browser DOM check confirmed
the new “Bulk CSV upload” controls and expected column hints render.

## Synthetic demo dataset

Added `backend/sample_data/cdr.csv`, `banking.csv`, and `social.csv`, with 360
total events and realistic fictional Indian identifiers. The planted patterns
are documented in `SAMPLE_CASE_GROUND_TRUTH.md`.

The one-click endpoint is:

```text
POST /cases/demo-seed
```

It creates `EVIDRA Synthetic Investigation`, loads all three CSV files, and
returns the case ID plus per-dataset counts. Fresh execution returned
`120/120/120` created and zero rejected. The seeded case returned populated
graph (360 edges), timeline (360 events), financial flow (120 flows), story
(360 cited claims), evidence (360 records), report, and copilot responses.

## Remaining limitations

- The two local regression passes used SQLite and supplemented the known
  missing audit table; they are not a claim that the migration chain is
  complete.
- The browser control check used the existing local Next.js server, whose
  current environment was still pointed at Render and therefore could not
  submit against the fresh local verification database from that browser
  session. Multipart API behavior was verified directly against the fresh
  local API.
- The frontend lint command is error-free but still reports 14 pre-existing
  hook/unused-variable warnings.

# Phase 4 verification follow-up

## Question 1 — Copilot relevance

The following was run against a fresh local SQLite API populated through
`POST /cases/demo-seed`, case
`23573729-7089-460a-ab29-8ef041f3dc58`. The requests were:

```text
POST /copilot/query {"case_id":"23573729-7089-460a-ab29-8ef041f3dc58","query":"transfer"}
POST /copilot/query {"case_id":"23573729-7089-460a-ab29-8ef041f3dc58","query":"call"}
```

Both returned HTTP 200. The actual response bodies contained different
evidence IDs and domain-specific claim text:

```text
transfer 200 [{"id":"ev_6e37971b-7421-4bb4-af2d-7f3383607ed3","text":"arjun.verma@upi transferred 12000.00 to rajesh.kumar@upi via IMPS [ev_6e37971b-7421-4bb4-af2d-7f3383607ed3].","evidenceId":"ev_6e37971b-7421-4bb4-af2d-7f3383607ed3","evidenceIds":["ev_6e37971b-7421-4bb4-af2d-7f3383607ed3"],"confidence":"high","rule":null},{"id":"ev_4f0b51f1-a23d-4c3a-8102-e56e8297860b","text":"nisha.rao@upi transferred 12375.00 to rajesh.kumar@upi via IMPS [ev_4f0b51f1-a23d-4c3a-8102-e56e8297860b].","evidenceId":"ev_4f0b51f1-a23d-4c3a-8102-e56e8297860b","evidenceIds":["ev_4f0b51f1-a23d-4c3a-8102-e56e8297860b"],"confidence":"high","rule":null},{"id":"ev_95b449c5-ad64-4852-a593-1f7612c9279a","text":"sanjay.jain@upi transferred 12750.00 to rajesh.kumar@upi via IMPS [ev_95b449c5-ad64-4852-a593-1f7612c9279a].","evidenceId":"ev_95b449c5-ad64-4852-a593-1f7612c9279a","evidenceIds":["ev_95b449c5-ad64-4852-a593-1f7612c9279a"],"confidence":"high","rule":null},{"id":"ev_0e7d9fb9-f15a-43be-94bf-4a4facd8a880","text":"pooja.mehta@upi transferred 13125.00 to rajesh.kumar@upi via IMPS [ev_0e7d9fb9-f15a-43be-94bf-4a4facd8a880].","evidenceId":"ev_0e7d9fb9-f15a-43be-94bf-4a4facd8a880","evidenceIds":["ev_0e7d9fb9-f15a-43be-94bf-4a4facd8a880"],"confidence":"high","rule":null},{"id":"ev_39c914c5-5055-4916-9ac7-cc1ea84b1b01","text":"imran.khan@upi transferred 13500.00 to rajesh.kumar@upi via IMPS [ev_39c914c5-5055-4916-9ac7-cc1ea84b1b01].","evidenceId":"ev_39c914c5-5055-4916-9ac7-cc1ea84b1b01","evidenceIds":["ev_39c914c5-5055-4916-9ac7-cc1ea84b1b01"],"confidence":"high","rule":null},{"id":"ev_e71c8bf2-d6f9-4945-85f4-4952fb95c5f5","text":"kavita.singh@upi transferred 13875.00 to rajesh.kumar@upi via IMPS [ev_e71c8bf2-d6f9-4945-85f4-4952fb95c5f5].","evidenceId":"ev_e71c8bf2-d6f9-4945-85f4-4952fb95c5f5","evidenceIds":["ev_e71c8bf2-d6f9-4945-85f4-4952fb95c5f5"],"confidence":"high","rule":null},{"id":"ev_4ae76c0b-9a21-4862-9e66-38a9068022ad","text":"deepak.nair@upi transferred 14250.00 to rajesh.kumar@upi via IMPS [ev_4ae76c0b-9a21-4862-9e66-38a9068022ad].","evidenceId":"ev_4ae76c0b-9a21-4862-9e66-38a9068022ad","evidenceIds":["ev_4ae76c0b-9a21-4862-9e66-38a9068022ad"],"confidence":"high","rule":null},{"id":"ev_a50907e1-a072-4081-a083-23b8ddce996c","text":"anjali.iyer@upi transferred 14625.00 to rajesh.kumar@upi via IMPS [ev_a50907e1-a072-4081-a083-23b8ddce996c].","evidenceId":"ev_a50907e1-a072-4081-a083-23b8ddce996c","evidenceIds":["ev_a50907e1-a072-4081-a083-23b8ddce996c"],"confidence":"high","rule":null},{"id":"ev_98aa1df1-3ca5-4706-be0b-78b06aa28965","text":"arjun.verma@upi transferred 15375.00 to meena.shah@upi via IMPS [ev_98aa1df1-3ca5-4706-be0b-78b06aa28965].","evidenceId":"ev_98aa1df1-3ca5-4706-be0b-78b06aa28965","evidenceIds":["ev_98aa1df1-3ca5-4706-be0b-78b06aa28965"],"confidence":"high","rule":null},{"id":"ev_5777de66-0ab0-43e7-97da-9bb00d79e5e4","text":"nisha.rao@upi transferred 15750.00 to meena.shah@upi via IMPS [ev_5777de66-0ab0-43e7-97da-9bb00d79e5e4].","evidenceId":"ev_5777de66-0ab0-43e7-97da-9bb00d79e5e4","evidenceIds":["ev_5777de66-0ab0-43e7-97da-9bb00d79e5e4"],"confidence":"high","rule":null}]
call 200 [{"id":"ev_827dda30-8c80-4a54-9aba-08b45c3ddc73","text":"+919810000101 called +919810000102 for 181 seconds [ev_827dda30-8c80-4a54-9aba-08b45c3ddc73].","evidenceId":"ev_827dda30-8c80-4a54-9aba-08b45c3ddc73","evidenceIds":["ev_827dda30-8c80-4a54-9aba-08b45c3ddc73"],"confidence":"high","rule":null},{"id":"ev_c462d4a8-fb8c-440d-9137-69d0d9f74727","text":"+919810000101 called +919810000103 for 182 seconds [ev_c462d4a8-fb8c-440d-9137-69d0d9f74727].","evidenceId":"ev_c462d4a8-fb8c-440d-9137-69d0d9f74727","evidenceIds":["ev_c462d4a8-fb8c-440d-9137-69d0d9f74727"],"confidence":"high","rule":null},{"id":"ev_41fed647-85f2-45ba-9d66-637f532aa900","text":"+919810000101 called +919810000104 for 183 seconds [ev_41fed647-85f2-45ba-9d66-637f532aa900].","evidenceId":"ev_41fed647-85f2-45ba-9d66-637f532aa900","evidenceIds":["ev_41fed647-85f2-45ba-9d66-637f532aa900"],"confidence":"high","rule":null},{"id":"ev_65e94693-9166-46ad-93b7-edd6a5de998c","text":"+919810000101 called +919810000105 for 184 seconds [ev_65e94693-9166-46ad-93b7-edd6a5de998c].","evidenceId":"ev_65e94693-9166-46ad-93b7-edd6a5de998c","evidenceIds":["ev_65e94693-9166-46ad-93b7-edd6a5de998c"],"confidence":"high","rule":null},{"id":"ev_8b030917-b12f-450d-a941-72397ee37cae","text":"+919810000102 called +919810000103 for 185 seconds [ev_8b030917-b12f-450d-a941-72397ee37cae].","evidenceId":"ev_8b030917-b12f-450d-a941-72397ee37cae","evidenceIds":["ev_8b030917-b12f-450d-a941-72397ee37cae"],"confidence":"high","rule":null},{"id":"ev_ad6e04e8-ee4d-42b1-b63c-864e4f09a4de","text":"+919810000102 called +919810000104 for 186 seconds [ev_ad6e04e8-ee4d-42b1-b63c-864e4f09a4de].","evidenceId":"ev_ad6e04e8-ee4d-42b1-b63c-864e4f09a4de","evidenceIds":["ev_ad6e04e8-ee4d-42b1-b63c-864e4f09a4de"],"confidence":"high","rule":null},{"id":"ev_903feddc-52dc-4b77-9f0b-f83d086a9e9e","text":"+919810000102 called +919810000105 for 187 seconds [ev_903feddc-52dc-4b77-9f0b-f83d086a9e9e].","evidenceId":"ev_903feddc-52dc-4b77-9f0b-f83d086a9e9e","evidenceIds":["ev_903feddc-52dc-4b77-9f0b-f83d086a9e9e"],"confidence":"high","rule":null},{"id":"ev_3330d063-1c0d-4839-a26c-c187b8c00355","text":"+919810000103 called +919810000104 for 188 seconds [ev_3330d063-1c0d-4839-a26c-c187b8c00355].","evidenceId":"ev_3330d063-1c0d-4839-a26c-c187b8c00355","evidenceIds":["ev_3330d063-1c0d-4839-a26c-c187b8c00355"],"confidence":"high","rule":null},{"id":"ev_3f7b7575-be67-4a0f-8dc7-42053c293467","text":"+919810000103 called +919810000105 for 189 seconds [ev_3f7b7575-be67-4a0f-8dc7-42053c293467].","evidenceId":"ev_3f7b7575-be67-4a0f-8dc7-42053c293467","evidenceIds":["ev_3f7b7575-be67-4a0f-8dc7-42053c293467"],"confidence":"high","rule":null},{"id":"ev_3c4cfe47-4950-40e5-827d-0094a8768bae","text":"+919810000104 called +919810000105 for 190 seconds [ev_3c4cfe47-4950-40e5-827d-0094a8768bae].","evidenceId":"ev_3c4cfe47-4950-40e5-827d-0094a8768bae","evidenceIds":["ev_3c4cfe47-4950-40e5-827d-0094a8768bae"],"confidence":"high","rule":null}]
```

The bodies are not identical, and every transfer result is banking text while
every call result is CDR text. No copilot scoring change was required.

## Question 2 — Audit migration

The complete migration directory before this follow-up contained only
`0001_create_cases.py`, `0002_add_dataset_tables.py`,
`0003_add_evidence_records.py`, and `0004_add_case_investigation_details.py`.
Their `down_revision` values formed one linear chain ending at `0004`; none
created `audit_log_entries`. The table existed on Render because it had been
provisioned outside that chain, while `migrations/env.py` only imported the
model metadata and did not create tables.

Added `backend/migrations/versions/0005_add_audit_log_entries.py`. Its upgrade
creates the model's exact columns and `ix_audit_log_entries_case_id` on a fresh
database, while checking for an existing table/index so an already-provisioned
Render database can advance to the new head safely.

Fresh verification, with no `Base.metadata.create_all()`:

```text
alembic upgrade head
... Running upgrade 0004_add_case_investigation_details -> 0005_add_audit_log_entries, add audit log entries
TABLES= [('alembic_version',), ('audit_log_entries',), ('banking_records',), ('cases',), ('cdr_records',), ('evidence_records',), ('identity_records',), ('ipdr_records',), ('social_records',)]
CREATE_STATUS=201 CASE_ID=98a1bb4b-c2fa-474c-af23-680dcdf88a29
AUDIT_STATUS= 200 BODY= []
```

## Question 3 — TopBar navigation

The exact diff was limited to removing the synchronous no-case reset from the
effect and deriving `displayedCase` only when `currentCase.id === caseId`.
The browser sequence was dashboard → case overview →
case graph → dashboard → login using live Render case
`449e410e-ca56-486b-a1cd-05d5d6dfe490`.

```text
/dashboard: banner="Command Center", hasCaseName=false, hasUuidCrumb=false
/case/...: banner="Live Entity Verification\nOverview", hasCaseName=true, hasUuidCrumb=false
/case/.../graph: banner="Live Entity Verification\nInvestigation Graph", hasCaseName=true, hasUuidCrumb=false
/dashboard: banner="Command Center", hasCaseName=false, hasUuidCrumb=false
/login: no-banner, hasCaseName=false, hasUuidCrumb=false
consoleWarnings=[]
```

The case title updated correctly and cleared when leaving case context. The
browser did emit repeated existing SVG errors on the login visual:
`Error: <circle> attribute cx: Expected length, "undefined".` and the
corresponding `cy` error. No warning was emitted. These errors were not caused
by `TopBar.tsx`; no TopBar change was made for them in this verification-only
pass.

## Question 4 — Identity and IPDR status

- `backend/app/models/datasets.py` contains both `IpdrRecord` and
  `IdentityRecord`, and `backend/app/routes/ipdr.py` and
  `backend/app/routes/identity.py` provide real single-row POST and list GET
  endpoints. The pages call `createIpdr`/`listIpdr` and
  `createIdentity`/`listIdentity` from `frontend/lib/api.ts`, then render the
  returned records. They are not mock-only pages or empty stubs.
- Neither page has bulk upload controls, and no bulk endpoint was added for
  either dataset in Phase 4. They remain a prioritized follow-up if judges
  need bulk IPDR or identity ingestion.

## Lightweight non-regression verification

The follow-up reran the existing backend test command, frontend TypeScript
check, lint, production build, and a demo-seed investigation flow after the
audit migration:

```text
pytest -v => FAILED: 7 existing live-Postgres/API-dependent tests failed
while opening the configured SessionLocal or calling the expected API; the
three tests that do not require that live setup passed. The first failure was
test_issue1.py::test_investigate_async_correctness at await db.commit(), before
the behavior assertion. No test file was changed.

npx tsc --noEmit => exit 0
npm run lint => exit 0, 0 errors, 14 warnings
npm run build => exit 0, Next.js 16.3.2 production build passed

POST /cases/demo-seed => 201, CDR=120, banking=120, social=120
GET /cases/{id}/graph => 200, edges=360
GET /cases/{id}/timeline => 200, events=360
GET /cases/{id}/financial => 200, flows=120
GET /cases/{id}/story => 200, claims=360
POST /copilot/query transfer => 200, claims=10
```

The demo flow therefore passed end to end on the fresh migrated database.

## Investigation graph follow-up: report co-occurrence modeling

Observed in case `19cb5ebe-e838-4b97-96b0-8fe929f11b3a`: report-extracted
entities (person, vehicle, IP, etc.) currently create graph nodes but no
relationship edges to other entities mentioned in the same report.

This is a separate modeling decision, not part of the graph dedup/layout fix:
determine what confidence level report co-occurrence edges should receive.
They will likely be lower confidence than observed CDR/Banking edges, similar
to or below the ambiguous person-social derived edges.

## Known trade-offs

- Layout runs synchronously; graphs above ~250 nodes may visibly block the UI
  for several seconds. No verified production max-node count exists yet —
  revisit with Web Worker or async layout if real cases approach this scale.
- Seed is derived from visible entity IDs; layout reshuffles fully on filter
  change, node add/remove, or edge change. Stability holds only for an
  unchanged visible graph.
