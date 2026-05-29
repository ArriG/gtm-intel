# GTM Intelligence — Claude Code Context

## What this project is

A full-stack AI-powered GTM research tool for AEs and SDRs. You type a company name, it searches tailored public sources (planned from Your Company profile) and returns a structured brief in ~30 seconds: company snapshot, account fit score, buying committee with pain points, recent triggers, cold email opener, talk track, and more. Built as a portfolio piece by a Senior AE learning to code.

Primary dev environment: **Replit** (runs the live app). This local clone is synced to GitHub and used for Claude Code / Cursor sessions.

**Architecture (DB, API routes, persistence decisions):** see [`docs/architecture.md`](docs/architecture.md)

## Folder map

```
gtm-intel/
├── artifacts/
│   ├── api-server/src/         ← Express 5 backend
│   │   ├── routes/             ← one file per resource
│   │   └── lib/brief-ai.ts     ← shared Claude helpers (ICP context, cite stripping)
│   └── gtm-intel/src/          ← React + Vite frontend
│       └── pages/              ← one file per page
├── docs/
│   └── architecture.md         ← ADR: schema, routing, what lives in DB vs localStorage
├── lib/
│   ├── api-spec/openapi.yaml   ← SOURCE OF TRUTH for all API shapes
│   ├── api-client-react/src/generated/  ← auto-generated (do not edit)
│   └── api-zod/src/generated/  ← auto-generated (do not edit)
└── CLAUDE.md                   ← this file
```

## Stack

- **Frontend:** React + TypeScript + Tailwind + shadcn/ui, Vite, Wouter (routing), TanStack Query
- **Backend:** Express 5, Anthropic SDK (web_search tool), Drizzle ORM
- **DB:** PostgreSQL (on Replit) — ICPs, signals only
- **AI model:** `claude-haiku-4-5-20251001` — intentionally kept on Haiku while validating token usage; switch to Sonnet once stable
- **Codegen:** Orval reads `lib/api-spec/openapi.yaml` → generates types in `lib/api-client-react` and `lib/api-zod`
- **Package manager:** pnpm workspaces

## Key architecture decisions (summary)

Full detail in [`docs/architecture.md`](docs/architecture.md).

- `openapi.yaml` is the single source of truth. Never edit generated files directly.
- Codegen: `/opt/homebrew/bin/node ./lib/api-spec/node_modules/orval/dist/bin/orval.mjs --config ./lib/api-spec/orval.config.ts`
- **Postgres:** ICPs (drive brief scoring + signal radar), signals. **Not** briefs, Your Company, or history.
- **localStorage:** Your Company (`gtm_your_company_v3`), brief history, recent searches.
- **Your Company** sent in POST body (`yourCompany`) → seller context in Claude prompt.
- **LinkedIn posts + own intel** in POST body → highest-priority research context.
- **Account brief AI routes:** `POST /account-brief` (web search), `/cold-email` and `/talk-track` (regenerate from brief JSON), `POST /market-prospect` (web search).
- **Battlecards:** UI removed earlier; REST API + OpenAPI removed in `66cfe13`. DB table schema file remains — see architecture doc.
- Clearbit autocomplete from browser (no backend proxy).

## Default AU sources (fallback when no saved plan)

1. Company website + blog
2. ABN / ASIC registry
3. Seek job postings (highest signal for pain points)
4. LinkedIn C-suite posts
5. AFR / SmartCompany / fintech.com.au

Account briefs derive research sources automatically from Your Company (geographies, deal size, industry). Signal radar and market prospect still use AU-biased prompts.

## Shipped (through commit `af903c6`)

- Sidebar layout, polish, collapsible recent searches, Your Company page
- Your Company Phase B+C (localStorage → API → prompt)
- Save as ICP from brief
- ICP scoring prompt tuning (uses AE context + defined ICPs)
- Cold email tone toggle (Formal / Direct / Conversational) + regenerate endpoint
- Talk track generator
- Market prospecting page (`/prospect`)
- Export brief (download .txt, print PDF)
- GitHub README
- Battlecard API cleanup
- Cite tag stripping in AI responses
- Null-safe Save as ICP when brief omits optional sections

## Milestone 1 — Your Company as product spine (commit `1cc399b`)

- **Your Company** is the first sidebar item (Setup section above Research)
- First-run redirect: unconfigured users land on `/your-company`, not Search
- Brief generation gated until Your Company is complete (empty state + CTA)
- Expanded `YourCompany` schema: `companyName`, `oneLineDescription`, `industryServed`, `geographies`, `dealSize` (array — tick all motions that apply), `buyerTitles`, `painPointsSolved` (+ optional `customerOutcomes`; legacy prompt fields derived on save)
- localStorage bumped to `gtm_your_company_v3` — no migration from v2 (pre-launch; users re-fill Your Company)
- Hero treatment on Your Company setup page

## Next milestones (not built yet)

- **Milestone 3:** Flexible Brief schema — up to 3 relevant decision-makers regardless of deal size *(shipped on branch)*

## Milestone 4 — Reasoning UI *(shipped on branch)*

- Auto-detect sector pack from Your Company profile (geographies + industry + what you sell + company name)
- Optional manual pack override on `/reasoning`
- `whyNowPattern` and `reasoningOverrides` fields wired into composed system prompt
- `POST /api/your-company/preview-prompt` + Reasoning sidebar page with prompt preview
- New sector pack: `uk-financial-services.md`

## Milestone 2 — Automatic research sources (commit `89acbcf`)

- Account brief prompt derives UK/AU/NZ/US sources from Your Company — no separate source-plan step or UI
- Driven by geographies, `dealSize` (multi-select), and industry (e.g. UK enterprise + banks/insurers → Companies House, FCA, UK financial press)
- Falls back to default AU five when geographies are missing

## Backlog (next ideas)

- Normalize partial `AccountBrief` responses on backend before returning
- Drop orphan `battlecards` Postgres table (migration)
- Optional GitHub Actions typecheck CI
- ICP scoring / brief quality tuning as you use it in the field
- Consider Sonnet for full brief generation once Haiku token profile is stable
- README screenshot + live Replit URL

## Gotchas

- **pnpm preinstall hook** blocks `pnpm run X` locally. Work around with direct `node` paths (see codegen above).
- **Generated files are committed** — do not `git clean` generated dirs without re-running Orval.
- **Replit is live.** After push to GitHub, `git pull` on Replit. No install if only TS changed.
- **Node 26** locally at `/opt/homebrew/bin/node` if `node` not in PATH.
- **TypeScript:** `node node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc`
- **api-client-react composite project:** run `tsc -p lib/api-client-react` if frontend can't see new OpenAPI types.
- **Haiku may return partial brief JSON** — frontend guards with optional chaining; see architecture doc.
- **Account Map on Replit:** After `git pull`, **restart the server** (Stop → Run). On boot, the API logs `[account-map] runtime config` — confirm `pass1Model: "claude-sonnet-4-6"`, `pass1.maxSearches: 4`, `leadershipEnrichCap: 5`, and `pass2.searchesPerEntity: true` before testing Zurich. Revert to Haiku: `MAPPING_MODEL=claude-haiku-4-5-20251001`. Sonnet Pass 2 only: set `MAPPING_PASS_2_MODEL=claude-sonnet-4-6` with Haiku on Pass 1.
- **MAP_STRUCTURE_ONLY:** Set `MAP_STRUCTURE_ONLY=1` in Replit Secrets/env for a cheap structure-only map (Pass 1, no leadership pass). Remove or set `0` for full two-pass maps.
- **Mapping region scope:** Mapping mode sends a `region` (`emea`/`apac`/`north_america`/`latam`; default `emea`). The chosen region is mapped in full depth; other regions are name-only in `unmappedEntities[]`. Narrows the search so large enterprises finish inside the search/timeout budget.
