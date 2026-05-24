# GTM Intelligence

An AI-powered research tool for AEs and SDRs — type a company name and get a sourced account brief in ~30 seconds, including company snapshot, ICP fit score, buying committee, recent triggers, and a personalised cold email opener.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `ANTHROPIC_API_KEY` — for AI brief generation

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind + shadcn/ui, Wouter (routing), TanStack Query
- API: Express 5 + Anthropic SDK (web_search tool)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- **API contract:** `lib/api-spec/openapi.yaml` — single source of truth, edit this then run codegen
- **Generated TS types + React Query hooks:** `lib/api-client-react/src/generated/` — do not edit directly
- **Generated Zod validators:** `lib/api-zod/src/generated/` — do not edit directly
- **Backend routes:** `artifacts/api-server/src/routes/` — one file per resource
- **Core AI route:** `artifacts/api-server/src/routes/account-brief.ts` — contains the full Claude prompt and source logic
- **Frontend pages:** `artifacts/gtm-intel/src/pages/` — one file per page
- **DB schema:** `lib/db/src/schema/` — Drizzle table definitions

## Architecture decisions

- `openapi.yaml` is the single source of truth for all API shapes. Update it, then run codegen — never edit generated files by hand.
- Brief history is stored in localStorage (not DB) — intentional, keeps it client-side and private to the user.
- ICP scoring is dynamic: the backend fetches your defined ICPs from Postgres at request time and injects them into the Claude prompt for company-specific scoring.
- Clearbit autocomplete is called directly from the browser (public endpoint, no auth required).
- LinkedIn posts and own intel are sent in the POST body (`linkedinPosts[]`, `ownIntel`) and injected into the prompt as highest-priority verified context.
- AI model is `claude-haiku-4-5-20251001` — kept on Haiku intentionally while validating token usage. Switch to Sonnet when ready.

## Product

Users (AEs, SDRs) search a company by name or URL. The tool searches 5 AU-specific sources (company website, ABN/ASIC registry, Seek job ads, LinkedIn C-suite posts, AFR/SmartCompany press) and returns a structured brief with:
- Company snapshot (size, industry, location, funding stage, ABN, tech stack)
- ICP fit score (scored against your defined ICPs)
- Buying committee with per-persona pain points and LinkedIn signals
- "What's going on in their world" narrative
- Recent triggers and news
- Cold email opener + full email
- Source chips on every section showing where data came from with confidence levels

Users can optionally paste LinkedIn posts from C-suite and add their own discovery notes before enriching — these become highest-priority context for the AI.

Brief history is saved locally and persists between sessions. Dashboard shows recent radar signals and ICP count.

## User preferences

- Keep responses concise and plain-English — user is a Senior AE learning to code, not a developer
- British English spelling in prose
- Show commands before running them; ask before installing packages
- Simple, readable code over clever/compact code
- AI model stays on Haiku until UI and output quality are validated, then switch to Sonnet

## Gotchas

- **Always update `openapi.yaml` first** when changing API shapes, then run codegen. Never edit the generated files.
- **Codegen on Replit:** `pnpm --filter @workspace/api-spec run codegen`
- **After pushing to GitHub:** run `git pull` on Replit to sync. API server changes require a rebuild — post-merge runs `pnpm --filter @workspace/api-server run build`, or restart the API service manually.
- **502 on Replit** usually means the API server crashed — check the Replit console for the error, often a syntax error or missing env var.
- **`DATABASE_URL` and `ANTHROPIC_API_KEY`** must be set in Replit Secrets or the server won't start.

## Pointers

- See `CLAUDE.md` in the repo root for Claude Code session context, backlog, and local dev gotchas
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
