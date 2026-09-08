# PHASE4 BASELINE - live Render API (2026-09-08)
POST /auth/login valid => 200 body=access_token present
POST /auth/login invalid => 401 {"detail":"Invalid username or password."}
GET /auth/me => 200 {"username":"demo","role":"analyst"}
POST /cases => 201 id=516c360e-735e-43a7-8bb0-5050518cfea1
GET /cases => 200 count=48
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490 => 200 nonempty=True
POST /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/cdr => 201
POST /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/banking => 201
POST /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/social => 201
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/cdr => 200 count=2
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/banking => 200 count=2
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/social => 200 count=1
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/graph => 200 entities=6 keys=entities,edges,fraudMetrics
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/timeline => 200 count=5 keys=Count,Length,LongLength,Rank,SyncRoot,IsReadOnly,IsFixedSize,IsSynchronized
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/financial => 200  keys=flows,nodes,links
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/geo => 200 count=0 keys=Count,Length,LongLength,Rank,SyncRoot,IsReadOnly,IsFixedSize,IsSynchronized
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/story => 200 claims=5 keys=narrative,claims,uncitedSentences,provenanceVerified,caseId,prompt,provider
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/evidence => 200 evidence=5 keys=evidence
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/copilot => 200 count=1 keys=Count,Length,LongLength,Rank,SyncRoot,IsReadOnly,IsFixedSize,IsSynchronized
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/report => 200 evidence=5 keys=metadata,case,graph,timeline,story,dashboard,evidence,provenanceVerified
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/investigate_all => 200 evidence=5 keys=graph,timeline,evidence
GET /cases/449e410e-ca56-486b-a1cd-05d5d6dfe490/audit => 200 count=3 keys=Count,Length,LongLength,Rank,SyncRoot,IsReadOnly,IsFixedSize,IsSynchronized
POST /copilot/query 'bank transfers' => 200 nonempty=True
POST /copilot/query 'phone calls' => 200 nonempty=True
DELETE /cases/516c360e-735e-43a7-8bb0-5050518cfea1 => 204

# Frontend baseline
## npx tsc --noEmit


## npm run lint

> evidra@0.1.0 lint
> eslint


C:\evidra\frontend\app\(app)\case\[id]\banking\page.tsx
  34:6   warning  React Hook useEffect has a missing dependency: 'loadRecords'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  56:14  warning  'err' is defined but never used                                                                                 @typescript-eslint/no-unused-vars

C:\evidra\frontend\app\(app)\case\[id]\data\page.tsx
  33:6   warning  React Hook useEffect has a missing dependency: 'loadRecords'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  54:14  warning  'err' is defined but never used                                                                                 @typescript-eslint/no-unused-vars

C:\evidra\frontend\app\(app)\case\[id]\graph\page.tsx
  55:5  warning  React Hook useMemo has a missing dependency: 'edges'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

C:\evidra\frontend\app\(app)\case\[id]\identity\page.tsx
  15:44  warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

C:\evidra\frontend\app\(app)\case\[id]\ipdr\page.tsx
  15:44  warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

C:\evidra\frontend\app\(app)\case\[id]\social\page.tsx
  34:6   warning  React Hook useEffect has a missing dependency: 'loadRecords'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  55:14  warning  'err' is defined but never used                                                                                 @typescript-eslint/no-unused-vars

C:\evidra\frontend\app\(app)\case\[id]\timeline\page.tsx
  37:5  warning  React Hook useMemo has a missing dependency: 'timeline'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

C:\evidra\frontend\app\(app)\case\new\page.tsx
  44:14  warning  'err' is defined but never used  @typescript-eslint/no-unused-vars

C:\evidra\frontend\components\graph\InvestigationGraph.tsx
  110:5  warning  React Hook useMemo has a missing dependency: 'entities'. Either include it or remove the dependency array    react-hooks/exhaustive-deps
  116:6  warning  React Hook useMemo has a missing dependency: 'edges'. Either include it or remove the dependency array       react-hooks/exhaustive-deps
  390:6  warning  React Hook useEffect has a missing dependency: 'entities'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

C:\evidra\frontend\components\layout\TopBar.tsx
  27:7  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

C:\evidra\frontend\components\layout\TopBar.tsx:27:7
  25 |   useEffect(() => {
  26 |     if (!caseId) {
> 27 |       setCurrentCase(null);
     |       ^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  28 |       return;
  29 |     }
  30 |     getCase(caseId).then(setCurrentCase).catch(() => setCurrentCase(null));  react-hooks/set-state-in-effect

✖ 15 problems (1 error, 14 warnings)


## npm run build

> evidra@0.1.0 build
> next build

▲ Next.js 16.3.2 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 27ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.7s
  Running TypeScript ...
  Finished TypeScript in 4.2s ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (0/8) ...
  Generating static pages using 11 workers (2/8) 
  Generating static pages using 11 workers (4/8) 
  Generating static pages using 11 workers (6/8) 
✓ Generating static pages using 11 workers (8/8) in 360ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /case/[id]
├ ƒ /case/[id]/banking
├ ƒ /case/[id]/copilot
├ ƒ /case/[id]/data
├ ƒ /case/[id]/evidence
├ ƒ /case/[id]/financial
├ ƒ /case/[id]/graph
├ ƒ /case/[id]/identity
├ ƒ /case/[id]/ipdr
├ ƒ /case/[id]/map
├ ƒ /case/[id]/report
├ ƒ /case/[id]/social
├ ƒ /case/[id]/timeline
├ ○ /case/new
├ ○ /dashboard
├ ○ /forgot-password
└ ○ /login


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

