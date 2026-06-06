import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  callClaudeJsonWithSearch,
  stripCitationTags,
  type YourCompanyInput,
} from "../lib/brief-ai";
import {
  composeAccountBriefPrompt,
} from "../prompts/compose-system-prompt";
import {
  listSectorPackOptions,
  type SectorPackSelection,
} from "../prompts/pack-loader";

const router: IRouter = Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUGGEST_PROFILE_FORMAT = `You are helping a B2B salesperson set up their SELLER
profile in a sales-research tool. Research the SELLER'S OWN company (named below) using ONE
wide web search sweep — their official website first, then public sources — and propose
values for their go-to-market profile.

These fields describe how the seller SELLS, inferred from their own marketing:
- oneLineDescription: one sentence on what they sell (their product/service).
- industryServed: the industries their CUSTOMERS are in (who they sell to), not their own sector label.
- geographies: regions/countries they sell in (e.g. "UK", "AU", "US"). Short tokens.
- buyerTitles: the job titles they typically sell to (e.g. "Chief Underwriting Officer").
- painPointsSolved: the customer problems they solve.
- customerOutcomes: concrete results they cite for customers (one short paragraph), else "".

Return ONLY valid JSON:
{
  "oneLineDescription": "string",
  "industryServed": "string",
  "geographies": ["string"],
  "buyerTitles": ["string"],
  "painPointsSolved": ["string"],
  "customerOutcomes": "string",
  "confidence": "high" | "medium" | "low",
  "sources": [{ "label": "e.g. Company website", "url": "https://..." }],
  "notes": "one short sentence if the site was thin or you inferred heavily, else \\"\\""
}

Rules:
- Only suggest what you can find or reasonably infer from real sources. Do NOT fabricate
  buyer titles, geographies, or outcomes. If unknown, return an empty string/array for that field.
- Prefer 3-6 buyerTitles and 3-6 painPointsSolved, highest-signal first.
- confidence reflects how much you found on real pages vs. guessed.
- Every source MUST have a real URL found in search. Drop sources without one.
- No markdown, no preamble — raw JSON only.`;

const SUGGEST_REASONING_FORMAT = `You are helping a B2B salesperson configure REASONING rules in a sales-research tool.
Research the SELLER'S OWN company (named below) using ONE wide web search sweep — their official website first,
then public sources — and propose values for how briefs should prioritise signals and follow seller-specific rules.

These fields tune how the AI reasons on every account brief:
- whyNowPatterns: observable signals on a prospect account that usually mean "worth calling now" for this seller
  (e.g. leadership hire, job posting, regulation change, funding, expansion). Infer from who they sell to and their
  marketing — not generic sales advice. Prefer 3-6 lines, highest-signal first.
- reasoningOverrides: short rules to append to the brief system prompt (tone, competitors, geography quirks,
  product positioning, phrases to use or avoid). Only from real positioning on their site. Prefer 0-5 lines.
  Do NOT invent competitor names or rules you cannot source.

Return ONLY valid JSON:
{
  "whyNowPatterns": ["string"],
  "reasoningOverrides": ["string"],
  "confidence": "high" | "medium" | "low",
  "sources": [{ "label": "e.g. Company website", "url": "https://..." }],
  "notes": "one short sentence if the site was thin or you inferred heavily, else \\"\\""
}

Rules:
- Only suggest what you can find or reasonably infer from real sources. If unknown, return empty arrays.
- confidence reflects how much you found on real pages vs. guessed.
- Every source MUST have a real URL found in search. Drop sources without one.
- No markdown, no preamble — raw JSON only.`;

function toSelectionMeta(selection: SectorPackSelection) {
  return {
    mode: selection.mode,
    packId: selection.pack?.id ?? null,
    packName: selection.pack?.name ?? null,
    autoDetectedId: selection.autoDetectedId,
    autoDetectedName: selection.autoDetectedName,
    matchScore: selection.matchScore,
    matchedKeywords: selection.matchedKeywords,
  };
}

router.get("/your-company/sector-packs", (_req, res): void => {
  const packs = listSectorPackOptions().map(pack => ({
    id: pack.id,
    name: pack.name,
    version: pack.version,
    geographies: pack.geographies,
  }));
  res.json({ packs });
});

router.post("/your-company/preview-prompt", (req, res): void => {
  const { yourCompany } = req.body as { yourCompany?: YourCompanyInput };

  if (!yourCompany || typeof yourCompany !== "object") {
    res.status(400).json({ error: "yourCompany is required" });
    return;
  }

  const composed = composeAccountBriefPrompt(yourCompany);

  res.json({
    systemPrompt: composed.systemPrompt,
    sectorPackSelection: toSelectionMeta(composed.sectorPackSelection),
    researchPack: composed.researchPack,
    availablePacks: listSectorPackOptions().map(pack => ({
      id: pack.id,
      name: pack.name,
      version: pack.version,
    })),
  });
});

router.post("/your-company/suggest-profile", async (req, res): Promise<void> => {
  const { companyName, website } = req.body as { companyName?: string; website?: string };
  const name = companyName?.trim();
  if (!name) {
    res.status(400).json({ error: "companyName is required" });
    return;
  }

  const researchedAt = new Date().toISOString();
  const userMessage = `Seller company: ${name}${website?.trim() ? `\nWebsite: ${website.trim()}` : ""}

Research this company and return ONLY the JSON object.`;

  try {
    const result = await callClaudeJsonWithSearch(
      client,
      SUGGEST_PROFILE_FORMAT,
      userMessage,
      2000,
      90000,
    ) as Record<string, unknown>;

    const str = (v: unknown) => stripCitationTags(typeof v === "string" ? v.trim() : "");
    const list = (v: unknown) => Array.isArray(v)
      ? v.map(x => stripCitationTags(typeof x === "string" ? x.trim() : "")).filter(Boolean)
      : [];
    const sources = Array.isArray(result.sources)
      ? (result.sources as Array<Record<string, unknown>>)
          .map(s => ({ label: str(s.label), url: str(s.url) }))
          .filter(s => /^https?:\/\//i.test(s.url))
      : [];
    const confidence = ["high", "medium", "low"].includes(result.confidence as string)
      ? result.confidence
      : "low";

    res.json({
      oneLineDescription: str(result.oneLineDescription),
      industryServed: str(result.industryServed),
      geographies: list(result.geographies),
      buyerTitles: list(result.buyerTitles),
      painPointsSolved: list(result.painPointsSolved),
      customerOutcomes: str(result.customerOutcomes),
      confidence,
      sources,
      notes: str(result.notes),
      researchedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err, company: name }, message);
    res.status(500).json({ error: message });
  }
});

router.post("/your-company/suggest-reasoning", async (req, res): Promise<void> => {
  const {
    companyName,
    website,
    oneLineDescription,
    industryServed,
  } = req.body as {
    companyName?: string;
    website?: string;
    oneLineDescription?: string;
    industryServed?: string;
  };
  const name = companyName?.trim();
  if (!name) {
    res.status(400).json({ error: "companyName is required" });
    return;
  }

  const researchedAt = new Date().toISOString();
  const contextLines = [
    oneLineDescription?.trim() ? `What they sell: ${oneLineDescription.trim()}` : "",
    industryServed?.trim() ? `Industries their customers are in: ${industryServed.trim()}` : "",
  ].filter(Boolean);
  const userMessage = `Seller company: ${name}${website?.trim() ? `\nWebsite: ${website.trim()}` : ""}${
    contextLines.length > 0 ? `\n\n${contextLines.join("\n")}` : ""
  }

Research this company and return ONLY the JSON object.`;

  try {
    const result = await callClaudeJsonWithSearch(
      client,
      SUGGEST_REASONING_FORMAT,
      userMessage,
      2000,
      90000,
    ) as Record<string, unknown>;

    const str = (v: unknown) => stripCitationTags(typeof v === "string" ? v.trim() : "");
    const list = (v: unknown) => Array.isArray(v)
      ? v.map(x => stripCitationTags(typeof x === "string" ? x.trim() : "")).filter(Boolean)
      : [];
    const sources = Array.isArray(result.sources)
      ? (result.sources as Array<Record<string, unknown>>)
          .map(s => ({ label: str(s.label), url: str(s.url) }))
          .filter(s => /^https?:\/\//i.test(s.url))
      : [];
    const confidence = ["high", "medium", "low"].includes(result.confidence as string)
      ? result.confidence
      : "low";

    res.json({
      whyNowPatterns: list(result.whyNowPatterns),
      reasoningOverrides: list(result.reasoningOverrides),
      confidence,
      sources,
      notes: str(result.notes),
      researchedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err, company: name }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
