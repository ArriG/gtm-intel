# AU brief testing guide

Step-by-step guide to review, preview, deploy, and run AU segment / risk-calibration brief tests.

**Local verification (no API cost):** from repo root:

```bash
artifacts/api-server/node_modules/.bin/tsx artifacts/api-server/scripts/verify-au-brief-testing.ts
```

---

## What you shipped (the premise)

Before this change, every AU brief got the same flat five-source list (ABN, Seek, AFR, etc.). The model decided *what* to search, but not *in what order* or *through the seller's lens*.

After `d976053`, AU briefs (no sector pack) get a **six-step research procedure**:

1. **Segment** (`government` / `asx_listed` / `private_default`) — cheap heuristics on the input string. Step 0 tells Haiku to confirm and reassign if wrong.
2. **Seller-trigger hunt** — why-now pattern and pains drive searches for adverse events, not "company doing well" news.
3. **Rubric inversion** — risk/compliance sellers get `# CALL DECISION CALIBRATION` so bad news at the target raises priority.

**Preview limitation:** `POST /your-company/preview-prompt` does not pass `companyInput`. Preview always shows `Working segment: private_default`. Segment logs and segment-specific Step 2 lists only appear on a **real** brief search.

---

## Phase 1 — Review the diff in Cursor (5 min)

```bash
git diff 82c3154..d976053 -- artifacts/api-server/src/lib/research-source-plan.ts
```

| Check | What to look for |
|-------|------------------|
| Replaced, not duplicated | `isAuResearchPath()` → `buildAuResearchProcedureBlock(...)`; empty geographies no longer return `DEFAULT_AU_SOURCE_BLOCK` |
| UK untouched | Non-AU branch in `buildResearchSourceInstructions` unchanged |
| Wiring | `composeAccountBriefPrompt(yourCompany, companyInput?)` → `buildResearchSourceInstructions(..., companyInput)` |

---

## Phase 2 — Smoke test via `/reasoning` (free)

### Setup Your Company as ReFresh

- **Geographies:** Australia (or empty — both hit AU path on live briefs)
- **painPointsSolved:** include `risk`, `compliance`, `governance`, or `audit`
- **whyNowPattern:** e.g. *Organisations facing regulator scrutiny or workforce incidents need faster incident visibility*
- Sector pack override: **Auto** (no pack — otherwise you see pack body, not the procedure)

### Preview (`/reasoning` → Preview prompt)

| String to find | Proves |
|----------------|--------|
| `# RESEARCH PROCEDURE — follow steps in order. Search budget: 6 searches MAXIMUM.` | AU procedure active |
| your whyNowPattern inside `"""..."""` in Step 1 | whyNow wired |
| `# CALL DECISION CALIBRATION` | Risk-seller rubric |
| `Working segment: private_default` | Expected in preview |

---

## Phase 3 — Deploy to Replit

```bash
git log -1 --oneline   # expect d976053
git pull origin fix/brief-normalize-opener
```

Then **Stop → Run**.

---

## Phase 4 — Live brief tests (7 runs, ~$0.40–0.55)

**Brief mode** on `/`. Watch Replit **Console** for:

```text
[account-brief] au segment government|asx_listed|private_default
```

| # | Search input | Expected log | What it validates |
|---|--------------|--------------|-------------------|
| 1 | `Services Australia` | `government` | Gov heuristic; Comcare not SafeWork NSW (Commonwealth) |
| 2 | `Transport for NSW` | `government` | State gov context |
| 3 | `Qantas` | `private_default` | Step 0 reassignment — compare callDecision to #4 |
| 4 | `Qantas Airways Limited` | `asx_listed` | `" limited"` signal |
| 5 | `Suncorp` | depends | Pack regression: override pack on `/reasoning` to test pack + CALIBRATION |
| 6 | Prior private AU target | `private_default` | Output shape parity |
| 7 | Non-risk Your Company → preview | any | CALIBRATION **absent** |

### Test 3 vs 4

If #3 stays `watch` while #4 is `warm` with the same adverse news, Step 0 reassignment on Haiku is weak → consider server-side explicit segment (milestone 2).

---

## Phase 5 — Pass criteria

**Minimum:** Preview procedure + CALIBRATION; tests 1, 2, 4 segments correct; test 7 no calibration; brief JSON shape intact.

**Stretch:** Test 3 notes segment switch in `sourceSummary`; Qantas #3/#4 callDecision within one tier.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Old flat 5-source list | Sector pack active, wrong commit, or server not restarted |
| No segment log | Stale server process |
| CALIBRATION missing | painPointsSolved lacks risk keywords |
| `private_default` for `.gov.au` | Heuristic needs substring in input — try full URL |

See also [`docs/anthropic-sdk-bug-report.md`](anthropic-sdk-bug-report.md) for timeout billing.
