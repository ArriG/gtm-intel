import type { YourCompanyInput } from "./brief-ai";

/** Cap on buyingCommittee entries — same for all deal motions for now. */
export const MAX_BUYERS = 3;

const BUYER_PROMPT_BLOCK = `DECISION-MAKERS (buyingCommittee):
- Return up to ${MAX_BUYERS} people who are relevant to call — only include names/titles supported by research.
- Prefer people with a clear pain point or recent public signal; omit generic filler titles.
- Fewer is better than padding. One sharp decision-maker beats three vague ones.
- Include name when found. Empty linkedinSignal is OK when no public post was found.
- buyingRole is optional; use decision_maker for the primary call target when obvious.`;

export function buildBuyerMotionPromptBlock(yourCompany?: YourCompanyInput): string {
  const titles = yourCompany?.buyerTitles?.filter(Boolean) ?? [];
  const titleHint = titles.length > 0
    ? `Seller typically sells to: ${titles.join(", ")}.`
    : "";

  return titleHint ? `${BUYER_PROMPT_BLOCK}\n${titleHint}` : BUYER_PROMPT_BLOCK;
}
