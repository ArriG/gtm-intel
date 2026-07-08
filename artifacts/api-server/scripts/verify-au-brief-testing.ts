/**
 * Local verification for AU segment-aware brief procedure (commit d976053+).
 * Run from repo root:
 *   artifacts/api-server/node_modules/.bin/tsx artifacts/api-server/scripts/verify-au-brief-testing.ts
 */
import type { YourCompanyInput } from "../src/lib/brief-ai.ts";
import {
  detectAuSegment,
  buildResearchSourceInstructions,
} from "../src/lib/research-source-plan.ts";
import { composeAccountBriefPrompt } from "../src/prompts/compose-system-prompt.ts";

const refreshProfile: YourCompanyInput = {
  companyName: "ReFresh AI",
  oneLineDescription: "AI-powered risk and compliance workflow automation",
  industryServed: "Financial services and regulated enterprises",
  geographies: ["Australia"],
  dealSize: ["enterprise", "mid-market"],
  buyerTitles: ["Chief Risk Officer", "Head of Compliance"],
  painPointsSolved: [
    "Operational risk visibility",
    "Compliance audit readiness",
    "Governance reporting gaps",
  ],
  whyNowPattern:
    "Organisations facing regulator scrutiny or workforce incidents need faster incident visibility",
};

const nonRiskProfile: YourCompanyInput = {
  ...refreshProfile,
  companyName: "Acme CRM",
  painPointsSolved: ["Pipeline visibility", "Sales forecasting accuracy"],
};

const ukProfile: YourCompanyInput = {
  ...refreshProfile,
  geographies: ["United Kingdom"],
};

const segmentCases: Array<{ label: string; input: string; expected: ReturnType<typeof detectAuSegment> }> = [
  { label: "Test 1 Services Australia", input: "Services Australia", expected: "government" },
  { label: "Test 2 Transport for NSW", input: "Transport for NSW", expected: "government" },
  { label: "Test 3 Qantas", input: "Qantas", expected: "private_default" },
  { label: "Test 4 Qantas Airways Limited", input: "Qantas Airways Limited", expected: "asx_listed" },
  { label: "Test 6 private AU", input: "Atlassian", expected: "private_default" },
];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  OK: ${message}`);
}

console.log("\n=== Phase 1: Segment detection (live brief path) ===\n");
for (const { label, input, expected } of segmentCases) {
  const segment = detectAuSegment(input);
  console.log(`[account-brief] au segment ${segment}  ← ${label} ("${input}")`);
  assert(segment === expected, `${label} → ${expected} (got ${segment})`);
}

console.log("\n=== Phase 2: Reasoning preview (no companyInput) ===\n");
const preview = composeAccountBriefPrompt(refreshProfile);
assert(
  preview.systemPrompt.includes("# RESEARCH PROCEDURE — follow steps in order. Search budget: 6 searches MAXIMUM."),
  "Preview includes six-step AU procedure",
);
assert(
  preview.systemPrompt.includes('"""Organisations facing regulator scrutiny'),
  "Preview embeds whyNowPattern in Step 1 triple-quoted block",
);
assert(
  preview.systemPrompt.includes("# CALL DECISION CALIBRATION"),
  "Preview includes risk-seller CALIBRATION block for ReFresh",
);
assert(
  preview.systemPrompt.includes("Working segment: private_default"),
  "Preview uses private_default segment when companyInput absent",
);
assert(
  !preview.systemPrompt.includes("SOURCE 1 — Company website and blog:"),
  "Preview does not use old flat DEFAULT_AU_SOURCE_BLOCK",
);

console.log("\n=== Phase 3: Live prompt per test input (procedure segment line) ===\n");
for (const { label, input, expected } of segmentCases) {
  const instructions = buildResearchSourceInstructions(refreshProfile, input);
  assert(
    instructions.includes(`Working segment: ${expected}.`),
    `${label} procedure uses segment ${expected}`,
  );
  assert(
    instructions.includes("# RESEARCH PROCEDURE"),
    `${label} uses AU procedure not legacy block`,
  );
}

console.log("\n=== Phase 4: Qantas pair (Step 0 vs deterministic ASX) ===\n");
const qantasWeak = buildResearchSourceInstructions(refreshProfile, "Qantas");
const qantasStrong = buildResearchSourceInstructions(refreshProfile, "Qantas Airways Limited");
assert(qantasWeak.includes("Working segment: private_default."), "Qantas → private_default in procedure");
assert(qantasStrong.includes("Working segment: asx_listed."), "Qantas Airways Limited → asx_listed in procedure");
assert(
  qantasWeak.includes("If the working segment was wrong, switch source lists NOW"),
  "Weak Qantas prompt includes Step 0 reassignment instruction",
);
assert(
  qantasStrong.includes("ASX-LISTED:"),
  "Strong Qantas prompt leads with ASX source list in Step 2",
);

console.log("\n=== Phase 5: Non-risk seller + UK regression ===\n");
const nonRiskPreview = composeAccountBriefPrompt(nonRiskProfile);
assert(
  !nonRiskPreview.systemPrompt.includes("# CALL DECISION CALIBRATION"),
  "Non-risk seller preview omits CALIBRATION block",
);
const ukInstructions = buildResearchSourceInstructions(ukProfile, "Barclays");
assert(
  ukInstructions.includes("SOURCE 1 — Company website and blog:"),
  "UK profile still uses legacy geo source list (not AU procedure)",
);
assert(
  !ukInstructions.includes("# RESEARCH PROCEDURE"),
  "UK profile does not inject AU procedure",
);

console.log("\n=== Phase 6: Deploy check ===\n");
console.log("  Local HEAD should be d976053+ on fix/brief-normalize-opener");
console.log("  Replit: git log -1 --oneline → d976053, then Stop → Run");
console.log("  Live briefs: watch Console for [account-brief] au segment ... per search");

console.log("\n=== ALL LOCAL CHECKS PASSED ===\n");
console.log("Manual on Replit: run briefs 1–7 from docs/au-brief-testing-guide.md");
console.log("  (~$0.40–0.55 total). Compare Qantas #3 vs #4 callDecision in UI.\n");
