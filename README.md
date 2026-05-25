# GTM Intelligence

An AI-powered research tool for AEs and SDRs. Type a company name, get a sourced account brief in ~30 seconds — company snapshot, ICP fit score, buying committee, recent triggers, cold email opener, and discovery talk track.

![GTM Intelligence app — generated account brief](https://github.com/user-attachments/assets/18da5e7d-8a1f-4f2f-aa09-16c544a38169)

Built by a Salesman with 15+ years SaaS experience and zero prior coding background — a portfolio piece demonstrating full-stack product thinking from the seller's chair.

## Live demo

Deploy on [Replit](https://replit.com) — pull from this repo and set `ANTHROPIC_API_KEY` in Secrets.

## What it does

| Feature | Description |
|---------|-------------|
| **Company search** | Clearbit autocomplete + AI brief from 5 AU-specific sources |
| **Your Company** | Profile your product once — personalises every brief and email |
| **ICP scoring** | Score briefs against ICPs you define (or save companies as new ICPs) |
| **Cold email tones** | Formal / Direct / Conversational — regenerate with one click |
| **Talk track** | Discovery call opener + tailored questions from the brief |
| **Market prospecting** | Describe a target market → get 8–10 matching AU companies |
| **Export** | Download `.txt` or print to PDF |

### Research sources (AU-focused)

1. Company website + blog  
2. ABN / ASIC registry  
3. Seek job postings  
4. LinkedIn C-suite posts  
5. AFR / SmartCompany / fintech.com.au  

Plus optional context you paste: LinkedIn posts, your intel, Your Company profile.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind, shadcn/ui, Wouter, TanStack Query  
- **Backend:** Express 5, Anthropic SDK (`claude-haiku-4-5-20251001` + web search)  
- **Database:** PostgreSQL (Drizzle ORM)  
- **API contract:** OpenAPI → Orval codegen (`lib/api-spec/openapi.yaml`)  
- **Monorepo:** pnpm workspaces  

## Project structure

```
gtm-intel/
├── artifacts/
│   ├── api-server/src/routes/   ← Express routes (account-brief, icps, …)
│   └── gtm-intel/src/pages/     ← React pages
├── lib/
│   ├── api-spec/openapi.yaml    ← Source of truth for API shapes
│   ├── api-client-react/        ← Generated React Query hooks
│   └── api-zod/                 ← Generated Zod validators
└── CLAUDE.md                    ← Dev context for AI assistants
```

## Local development

Requires Node 26+ and pnpm (or use full paths — see `CLAUDE.md` for the pnpm preinstall workaround).

```bash
# Codegen after editing openapi.yaml
/opt/homebrew/bin/node ./lib/api-spec/node_modules/orval/dist/bin/orval.mjs --config ./lib/api-spec/orval.config.ts
```

Primary dev environment is **Replit**. After pushing to GitHub, run `git pull` on Replit to sync.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Claude API for brief generation |
| `DATABASE_URL` | Yes (Replit) | PostgreSQL connection |

## License

Private portfolio project.
