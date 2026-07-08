import type { YourCompanyInput } from "../lib/brief-ai";
import {
  buildReasoningOverridesBlock,
  buildWhyNowPatternBlock,
} from "../lib/brief-ai";
import { buildBuyerMotionPromptBlock } from "../lib/brief-motion";
import {
  buildResearchSourceInstructions,
  countConfiguredSources,
} from "../lib/research-source-plan";
import { BRIEF_RESPONSE_FORMAT } from "./brief-response-format";
import {
  countSourcesInPack,
  loadConstitution,
  resolveSectorPackSelection,
  toResearchPackMeta,
  type SectorPackMeta,
  type SectorPackSelection,
} from "./pack-loader";

export type ComposedBriefPrompt = {
  systemPrompt: string;
  researchPack: SectorPackMeta | null;
  sectorPackSelection: SectorPackSelection;
  enabledSourceCount: number;
  timeoutMs: number;
  speedSeconds: number;
};

function buildSpeedInstruction(seconds: number): string {
  return `SPEED INSTRUCTION: Complete all searches and return your response within ${seconds} seconds. If a source returns nothing useful after one search attempt, move on immediately — do not retry.`;
}

const RISK_SELLER_KEYWORDS = ["risk", "compliance", "safety", "governance", "audit", "regulat", "liabilit", "security"];

function isRiskReductionSeller(painPointsSolved?: string[]): boolean {
  if (!painPointsSolved?.length) return false;
  const joined = painPointsSolved.join(" ").toLowerCase();
  return RISK_SELLER_KEYWORDS.some((k) => joined.includes(k));
}

function buildCallDecisionCalibrationBlock(yourCompany?: YourCompanyInput): string {
  if (!isRiskReductionSeller(yourCompany?.painPointsSolved)) return "";
  return `# CALL DECISION CALIBRATION
Score fit against the SELLER's why-now pattern, not generic sales logic.
This seller sells risk-reduction / compliance / governance, therefore:
- Adverse regulator attention, audit findings, restructures, disputes, or public workforce issues at the target RAISE the temperature (they create urgency for the seller's category).
- "Company in flux, bad timing" is NOT a valid reason to score watch/skip for this seller. Justify the decision by linking a specific finding to a specific pain the seller solves.`;
}

function buildLegacySourceBlock(yourCompany?: YourCompanyInput, companyInput?: string): string {
  return buildResearchSourceInstructions(yourCompany, companyInput);
}

function buildSectorPackSourceBlock(packBody: string): string {
  return `${packBody}

When given a company URL, follow the sector pack above. Search across these HIGH-PRIORITY sources only — do not spend time on other sources.`;
}

export function composeAccountBriefPrompt(
  yourCompany?: YourCompanyInput,
  companyInput?: string,
): ComposedBriefPrompt {
  const constitution = loadConstitution();
  const selection = resolveSectorPackSelection(yourCompany);
  const pack = selection.pack;

  const sourceBlock = pack
    ? buildSectorPackSourceBlock(pack.body)
    : buildLegacySourceBlock(yourCompany, companyInput);

  const enabledSourceCount = pack
    ? countSourcesInPack(pack.body)
    : countConfiguredSources(yourCompany);

  const speedSeconds = pack?.expectedSeconds ?? 45;
  const timeoutMs = (pack?.expectedSeconds ?? 55) * 1000 + 10_000;
  const researchPack = pack ? toResearchPackMeta(pack) : null;
  const whyNowBlock = buildWhyNowPatternBlock(yourCompany);
  const reasoningBlock = buildReasoningOverridesBlock(yourCompany);
  const buyerMotionBlock = buildBuyerMotionPromptBlock(yourCompany);
  const callDecisionCalibrationBlock = buildCallDecisionCalibrationBlock(yourCompany);

  const systemPrompt = [
    "You are a world-class GTM research analyst.",
    "",
    constitution,
    "",
    sourceBlock,
    whyNowBlock,
    reasoningBlock,
    buyerMotionBlock,
    callDecisionCalibrationBlock,
    buildSpeedInstruction(speedSeconds),
    BRIEF_RESPONSE_FORMAT,
  ].filter(Boolean).join("\n\n");

  return {
    systemPrompt,
    researchPack,
    sectorPackSelection: selection,
    enabledSourceCount,
    timeoutMs,
    speedSeconds,
  };
}
