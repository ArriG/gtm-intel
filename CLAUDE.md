# GTM Intelligence — Claude Code Context

## What this project is

A full-stack AI-powered GTM research tool for AEs and SDRs. You type a company name, it searches 5 AU-specific sources and returns a structured brief in ~30 seconds: company snapshot, ICP fit score, buying committee with pain points, recent triggers, and a personalised cold email opener. Built as a portfolio piece by a Senior AE learning to code.

Primary dev environment: **Replit** (runs the live app). This local clone is synced to GitHub and used for Claude Code sessions.

## Folder map

```
gtm-intel/
├── artifacts/
│   ├── api-server/src/         ← Express 5 backend
│   │   └── routes/             ← one file per resource (account-brief, competitors, icps, etc.)
│   └── gtm-intel/src/          ← React + Vite frontend
│       └── pages/              ← one file per page
├── lib/
│   ├── api-spec/openapi.yaml   ← SOURCE OF TRUTH for all API shapes
│   ├── api-client-react/src/generated/  ← auto-generated TS types + React Query hooks (do not edit)
│   └── api-zod/src/generated/  ← auto-generated Zod validators (do not edit)
└── CLAUDE.md                   ← this file
```

## Stack

- **Frontend:** React + TypeScript + Tailwind + shadcn/ui, Vite, Wouter (routing), TanStack Query
- **Backend:** Express 5, Anthropic SDK (web_search tool), Drizzle ORM
- **DB:** PostgreSQL (on Replit)
- **AI model:** `claude-haiku-4-5-20251001` — intentionally kept on Haiku while validating token usage; switch to Sonnet once stable
- **Codegen:** Orval reads `lib/api-spec/openapi.yaml` → generates types in `lib/api-client-react` and `lib/api-zod`
- **Package manager:** pnpm workspaces

## Key architecture decisions

- `openapi.yaml` is the single source of truth. Never edit the generated files directly — update the spec and re-run codegen.
- Codegen command (run from repo root): `/opt/homebrew/bin/node ./lib/api-spec/node_modules/orval/dist/bin/orval.mjs --config ./lib/api-spec/orval.config.ts`
- Clearbit autocomplete is called directly from the browser (no backend proxy) — free public endpoint, no auth needed
- Brief history is saved to localStorage (not DB) — intentional, keeps it client-side and private
- ICP scoring is DB-backed: the backend loads your defined ICPs from Postgres and builds scoring context dynamically
- LinkedIn posts and own intel are sent as part of the POST `/api/account-brief` body (`linkedinPosts`, `ownIntel`) and injected into the Claude prompt as highest-priority context

## AU-specific sources (in the backend prompt)

1. Company website + blog
2. ABN / ASIC registry
3. Seek job postings (highest signal for pain points)
4. LinkedIn C-suite posts
5. AFR / SmartCompany / fintech.com.au

## What was done in the last session (May 2026)

- Updated `lib/api-spec/openapi.yaml` to match the real API response shape — the old spec described `topPainPoints`, `recentNews`, `suggestedOpeningLine` which no longer existed; replaced with `theirWorld`, `recentTriggers`, `coldEmail`, `sourceSummary`, `BriefSource`, `LinkedInPost`
- Re-ran Orval codegen — all generated files updated
- Removed ~55 lines of duplicate local type definitions from `artifacts/gtm-intel/src/pages/account-brief.tsx` — now imports from `@workspace/api-client-react` instead
- Fixed `icp-detail.tsx` TypeScript error on `jobTitles` (optional field accessed without null check)
- Installed Node 26 + pnpm locally via Homebrew (Node wasn't on this machine before)
- Committed and pushed all of the above (commit `c5ed7d8`)

## Current backlog (in priority order)

### Done in this session (2026-05-22)
- [x] Fix "10 source types" hardcoded text → now "5 source types" (commit `be2f6d2`)
- [x] Wire `main.tsx` to render `pages/account-brief.tsx` (the refactored file) and delete dead `App.tsx` (commit `be2f6d2`)
- [x] 30-second cooldown on the Enrich button (commit `be2f6d2`)
- [x] Sidebar layout + wouter routing for all existing pages; added missing `QueryClientProvider` (commit `d858753`)

### Next: in this order — don't reorder without revisiting
1. **Polish pass** — type scale, spacing rhythm, one accent colour, brandmark in sidebar, empty/loading states across all pages. Visual references: clay.com and https://practihealth.webflow.io (pull simple concepts, don't redesign from scratch). Tone should be consultative, not salesy.
2. **Solution Profile** (sidebar item) — persistent seller context injected as highest-priority context into every cold email. v1 fields:
   - Your company name
   - What you sell (1–2 sentences)
   - Who you typically sell to (industry/segment)
   - Top 3 pain points you solve
   - Customer outcomes you can cite (optional)
   Backend pattern follows the existing `linkedinPosts` / `ownIntel` injection on `POST /api/account-brief`.
3. **Save to ICP from brief** — "Save as ICP reference" button on the brief that pre-populates an ICP from the company snapshot. Now meaningful because the ICPs page is reachable via the sidebar.

### Parked — revisit after Save-to-ICP ships
- [ ] ICP scoring prompt tuning — score returns a real value when ICPs are defined, but prompt could better use LinkedIn/intel context
- [ ] Cold email tone toggle — Formal / Direct / Conversational, regenerates the email with one click (gets much better once Solution Profile exists)
- [ ] Talk track generator — one button from brief → discovery call questions based on their specific pain points (needs Solution Profile to be good)
- [ ] Market prospecting ("dentist feature") — describe a target market in plain English, get 8–10 matching company names back, click any to run a full brief. Could be driven automatically by Solution Profile.
- [ ] GitHub README — angle: "Built by a Senior AE with 15+ years SaaS experience and zero prior coding background." Include screenshot, live URL, stack.
- [ ] Export brief — copy-all or PDF download

## Gotchas

- **pnpm preinstall hook** blocks pnpm commands locally. Packages are installed fine but `pnpm run X` will error. Work around it by calling node/orval directly (see codegen command above).
- **Generated files are committed** — do not run `git clean` on `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/` unless you immediately re-run codegen.
- **Replit is the live environment.** After pushing to GitHub, do `git pull` on Replit to sync. No install step needed if only TS files changed.
- **Node 26 installed via Homebrew** at `/opt/homebrew/bin/node`. If `node` isn't found in PATH, use the full path.
- **TypeScript compiler** lives at `node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc` — use `node /that/path/tsc` if `tsc` isn't in PATH.
- **esbuild darwin-arm64** binary was manually placed at `node_modules/.pnpm/esbuild@0.27.3/node_modules/@esbuild/darwin-arm64` — needed for Orval to run on Apple Silicon.
