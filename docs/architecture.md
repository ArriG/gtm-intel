# GTM Intelligence — Architecture

Durable record of database, API, and routing decisions. Update this when changing persistence or endpoint shapes.

## Principles

1. **OpenAPI first** — `lib/api-spec/openapi.yaml` is the contract. Edit spec → run Orval → commit spec + generated files.
2. **Postgres for user-owned GTM config** — ICPs, signals. Not for ephemeral AI output or private AE notes.
3. **localStorage for private / session data** — Your Company profile, brief history, pasted context stays client-side unless explicitly POSTed for one request.
4. **One route file per resource** — `artifacts/api-server/src/routes/<resource>.ts`, mounted under `/api`.
5. **Haiku + web search for research** — Full briefs and market prospecting use `web_search`; cold email and talk track regenerate from existing brief JSON only (faster, cheaper).

---

## Database schema (PostgreSQL + Drizzle)

Location: `lib/db/src/schema/`

### Tables in active use

| Table | Route | Purpose |
|-------|-------|---------|
| `icps` | `/icps` | Ideal Customer Profiles. **Loaded on every account brief** to score fit; **drive signal radar** scans. |
| `signals` | `/signals` | Automated ICP radar results; dashboard recent feed. |

#### `icps`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `name`, `industry`, `company_size` | text | Required scalars |
| `job_titles`, `pain_points`, `goals`, `channels` | text (JSON array strings) | Stored as `JSON.stringify([])`, parsed in routes — not native PG arrays |
| `notes` | text | Optional |
| `created_at` | timestamp | |

**ICP data flow**

1. User creates ICP via UI → `POST /api/icps` → Postgres
2. User runs brief → `account-brief.ts` → `db.select().from(icpsTable)` → scoring block in Claude system prompt
3. User clicks **Save as ICP** on a brief → frontend pre-fills form → same `POST /api/icps`

#### `signals`

Prospecting opportunities discovered by `POST /signal-radar`. Columns include `company_name`, `company_domain`, `icp_name`, `icp_id` linking each signal to a matched ICP. `reviewed` boolean for inbox-style workflow.

**Signal radar flow**

1. User defines **Your Company** (industry / who you sell to) and optionally ICPs
2. User clicks **Run Radar** → `POST /market-prospect` with `{ mode: "signal-radar", yourCompany }`
3. Backend anchors web search to Your Company's target market; ICPs refine matches when present
4. Results persisted to `signals` table; user can mark reviewed, dismiss, or jump to account brief via domain link

### Orphan table (no API)

| Table | Status |
|-------|--------|
| `battlecards` | **Schema remains** in `lib/db/src/schema/battlecards.ts`. Battlecard **UI and REST API removed** (commit `66cfe13`). No migration run — table may still exist on Replit from earlier deploys. Safe to drop later with an explicit migration. |

### Explicitly not in the database

| Data | Storage | Rationale |
|------|---------|-----------|
| Your Company profile | `localStorage` key `gtm_your_company_v2` | Private AE config; sent per-request in POST body. v1 key ignored — users re-fill on upgrade (Milestone 1). |
| Research source plan | `localStorage` key `gtm_research_source_plan_v1` | Tailored web search sources; generated via `POST /research-source-plan`, sent with brief requests |
| Brief history / recent searches | `localStorage` | Client-side, private |
| Generated account briefs | None (ephemeral) | Returned in HTTP response only |
| LinkedIn paste / own intel | Request body only | Not persisted server-side |

---

## API routing (Express 5)

Mount: all routes prefixed with `/api` (see server bootstrap).

Registry: `artifacts/api-server/src/routes/index.ts`

```
GET  /healthz
GET  /dashboard

GET|POST        /icps
GET|PATCH|DELETE /icps/{id}

GET             /signals
POST            /signal-radar
PATCH|DELETE    /signals/{id}

POST /account-brief
POST /account-brief/cold-email
POST /account-brief/talk-track

POST /market-prospect
POST /research-source-plan
```

### Validation

- **CRUD routes** — Zod from `@workspace/api-zod` (`CreateIcpBody`, etc.)
- **AI routes** — Manual body typing + `parseJsonFromResponse()` + `sanitizeAiStrings()` in `artifacts/api-server/src/lib/brief-ai.ts`

---

## Account brief endpoints

### `POST /account-brief`

**Purpose:** Full company research via 5 AU web-search sources (~30–60s).

**Request body (`AccountBriefInput`):**

| Field | Required | Notes |
|-------|----------|-------|
| `url` | yes | Company URL |
| `linkedinPosts` | no | AE-pasted posts — highest-priority evidence |
| `ownIntel` | no | Discovery notes — ground truth |
| `yourCompany` | no | Seller context from localStorage |
| `researchSourcePlan` | no | Saved source plan from localStorage — drives web search instructions |
| `emailTone` | no | `formal` \| `direct` \| `conversational` (default `direct`) |

**Prompt context order (after base research instructions):** ICP scoring → Your Company → own intel → LinkedIn → email tone.

**Response:** `AccountBrief` JSON (see OpenAPI). All string fields sanitized to strip Anthropic `<cite>` markup.

### `POST /account-brief/cold-email`

**Purpose:** Regenerate cold email only (~5s). **No web search.**

**Request:** `ColdEmailRegenerateInput` = `BriefActionInput` + `emailTone`

- Sends research brief **without** existing `coldEmail` so the model writes fresh copy per tone
- Temperature `0.85` for variation
- Per-tone rules (greeting, structure, sign-off) in `brief-ai.ts`

### `POST /account-brief/talk-track`

**Purpose:** Discovery call opener + 5–7 questions from existing brief. **No web search.**

**Request:** `TalkTrackInput` (= `BriefActionInput`)

**Response:** `{ opening, discoveryQuestions[] }`

### `POST /market-prospect`

**Purpose:** Web search for 8–10 real AU companies matching a plain-English market description.

**Request:** `{ description, yourCompany? }`

**Response:** `{ companies: [{ name, domain, reason, estimatedSize? }] }`

Frontend: `/prospect` page → click result → Search with `/?q=domain`.

---

## OpenAPI schemas (brief-related)

| Schema | Role |
|--------|------|
| `YourCompany` | Seller profile fields (mirrors localStorage, not a DB entity) |
| `EmailTone` | Cold email voice |
| `BriefActionInput` | `companyName` + `AccountBrief` + optional context |
| `AccountBriefColdEmail` | `{ opener, fullEmail?, sources? }` |
| `TalkTrack` | `{ opening, discoveryQuestions[] }` |
| `MarketProspectInput` / `MarketProspectResponse` | Prospecting feature |

Codegen: `/opt/homebrew/bin/node ./lib/api-spec/node_modules/orval/dist/bin/orval.mjs --config ./lib/api-spec/orval.config.ts`

---

## Frontend routing (Wouter)

| Path | Page |
|------|------|
| `/your-company` | Seller profile (localStorage) — **first nav item; first-run landing** |
| `/` | Company search + brief — **gated until Your Company configured** |
| `/prospect` | Market prospecting |
| `/icps`, `/icps/:id` | ICP list + detail |
| `/signals` | ICP signal radar |
| `/dashboard` | Command center |

Clearbit autocomplete: browser → `autocomplete.clearbit.com` (no backend proxy).

---

## Known gaps / follow-ups

1. **Partial brief JSON** — OpenAPI requires full `AccountBrief` shape; Haiku sometimes omits `recentTriggers.items`. Frontend uses `?? []` fallbacks; backend does not yet normalize responses.
2. **`battlecards` table** — Drop with migration when ready; schema file can be removed then.
3. **No GitHub Actions CI** — Typecheck locally; Replit is live env (`git pull` after push).
4. **Model** — Haiku for cost/latency; consider Sonnet for brief quality once token usage is stable.

---

## Commit reference (May 2026)

| Commit | Summary |
|--------|---------|
| `9addf85` | Your Company wired into briefs; Save as ICP |
| `66cfe13` | Parked backlog: tones, talk track, prospecting, export, README, battlecard API removal |
| `c607f95` | Cite tag stripping; distinct cold email tones |
| `af903c6` | Null-safe Save as ICP when brief omits triggers |
