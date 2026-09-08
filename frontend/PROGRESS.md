# EVIDRA — Frontend (Work in Progress)

## Setup
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000

## ✅ Built so far
- `/` — Landing page (hero, problem framing, 3 entry modes, AI architecture pipeline, features, competitor comparison, Samanvaya/Pratibimb positioning, trust strip, CTA)
- `/login` — Sign-in (credentials → MFA flow, SSO option)
- `/dashboard` — Command Center (stat cards, 3-mode "Start Investigation" panel, weekly activity chart, case list, live alert feed)
- Shared design system: dark command-center theme, evidence citation chips (click any `Cite` badge to open the Evidence Provenance drawer), risk gauge, app shell (sidebar + topbar)

## 🚧 Not yet built
- `/case/[id]` — Case Workspace overview (header component exists, page not assembled)
- `/case/[id]/graph` — Investigation Graph (Cytoscape.js)
- `/case/[id]/timeline` — Digital Timeline
- `/case/[id]/financial` — Financial Flow
- `/case/[id]/map` — Geospatial View
- `/case/[id]/copilot` — AI Copilot
- `/case/[id]/evidence` — Evidence Viewer
- `/case/[id]/report` — Report Generator

All mock data (entities, evidence, timeline, graph edges, story claims) is already in `lib/data.ts` and ready to use for these pages.

Tech: Next.js 16 (App Router) + TypeScript + Tailwind v4 + Framer Motion + Cytoscape.js + Recharts + lucide-react.
