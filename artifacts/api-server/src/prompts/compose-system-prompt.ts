import type { YourCompanyInput } from "../lib/brief-ai";
import { buildBuyerMotionPromptBlock } from "../lib/brief-motion";
import {
  buildResearchSourceInstructions,
  countConfiguredSources,
} from "../lib/research-source-plan";
import { BRIEF_RESPONSE_FORMAT } from "./brief-response-format";
import {
  countSourcesInPack,
  loadConstitution,
  selectSectorPack,
  toResearchPackMeta,
  type SectorPackMeta,
} from "./pack-loader";

export type ComposedBriefPrompt = {
  systemPrompt: string;
  researchPack: SectorPackMeta | null;
  enabledSourceCount: number;
  timeoutMs: number;
  speedSeconds: number;
};

function buildSpeedInstruction(seconds: number): string {
  return `SPEED INSTRUCTION: Complete all searches and return your response within ${seconds} seconds. If a source returns nothing useful after one search attempt, move on immediately — do not retry.`;
}

function buildLegacySourceBlock(yourCompany?: YourCompanyInput): string {
  return buildResearchSourceInstructions(yourCompany);
}

function buildSectorPackSourceBlock(packBody: string): string {
  return `${packBody}

When given a company URL, follow the sector pack above. Search across these HIGH-PRIORITY sources only — do not spend time on other sources.`;
}

export function composeAccountBriefPrompt(yourCompany?: YourCompanyInput): ComposedBriefPrompt {
  const constitution = loadConstitution();
  const pack = selectSectorPack(yourCompany);

  const sourceBlock = pack
    ? buildSectorPackSourceBlock(pack.body)
    : buildLegacySourceBlock(yourCompany);

  const enabledSourceCount = pack
    ? countSourcesInPack(pack.body)
    : countConfiguredSources(yourCompany);

  const speedSeconds = pack?.expectedSeconds ?? 45;
  const timeoutMs = (pack?.expectedSeconds ?? 55) * 1000 + 10_000;
  const researchPack = pack ? toResearchPackMeta(pack) : null;
  const buyerMotionBlock = buildBuyerMotionPromptBlock(yourCompany);

  const systemPrompt = `You are a world-class GTM research analyst.

${constitution}

${sourceBlock}

${buyerMotionBlock}

${buildSpeedInstruction(speedSeconds)}

${BRIEF_RESPONSE_FORMAT}`;

  return {
    systemPrompt,
    researchPack,
    enabledSourceCount,
    timeoutMs,
    speedSeconds,
  };
}
