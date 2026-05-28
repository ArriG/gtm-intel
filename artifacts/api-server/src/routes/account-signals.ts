import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildEmailToneInstruction,
  buildYourCompanyContext,
  callClaudeJson,
  callClaudeJsonWithSearch,
  stripCitationTags,
  type EmailTone,
  type YourCompanyInput,
} from "../lib/brief-ai";
import { composeAccountBriefPrompt } from "../prompts/compose-system-prompt";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TIER_1_TYPES = new Set([
  "leadership_hire",
  "job_posting",
  "exec_post",
  "funding",
  "regulation",
]);

const VALID_TYPES = new Set([
  ...TIER_1_TYPES,
  "earnings",
  "expansion",
  "ma",
  "hiring_spike",
  "product_launch",
]);

const SIGNAL_SCAN_FORMAT = `ACCOUNT SIGNAL SCAN — return buying signals for ONE target account.

Scan for Tier 1 and Tier 2 signal types from the LAST 90 DAYS ONLY using ONE wide web search sweep (not one search per type).

Tier 1 types: leadership_hire, job_posting, exec_post, funding, regulation
Tier 2 types: earnings, expansion, ma, hiring_spike, product_launch

DO NOT include layoffs, crisis events, competitor mentions, or any other Tier 4 categories.

Return ONLY valid JSON:
{
  "signals": [
    {
      "type": "job_posting",
      "tier": 1,
      "headline": "One-line summary",
      "summary": "2-3 sentences on what happened",
      "whyItMatters": "1-2 sentences tied to the seller's value prop and ICP — not generic",
      "sourceUrl": "https://verifiable-source.example",
      "sourceTitle": "e.g. Insurance Times, LinkedIn, FT",
      "occurredAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}

Rules:
- Return at most 5 signals, highest outreach value first
- Only include events from the last 90 days
- Every signal MUST have a verifiable sourceUrl found in search — reject and omit signals without one; do not invent URLs
- Assign tier accurately: Tier 1 types = 1, Tier 2 types = 2
- whyItMatters must reference what WE sell and who we sell to from Your Company context
- occurredAt is ISO 8601 when extractable, otherwise null
- CRITICAL: no markdown, no preamble — raw JSON only`;

type RawSignal = {
  type?: string;
  tier?: number;
  headline?: string;
  summary?: string;
  whyItMatters?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  occurredAt?: string | null;
};

function expectedTier(type: string): 1 | 2 {
  return TIER_1_TYPES.has(type) ? 1 : 2;
}

function normaliseSignals(raw: unknown, scannedAt: string): Array<Record<string, unknown>> {
  if (!raw || typeof raw !== "object") return [];

  const items = (raw as { signals?: unknown }).signals;
  if (!Array.isArray(items)) return [];

  const results: Array<Record<string, unknown>> = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const signal = item as RawSignal;
    const type = typeof signal.type === "string" ? signal.type.trim() : "";
    if (!VALID_TYPES.has(type)) continue;

    const headline = stripCitationTags(signal.headline?.trim() ?? "");
    const summary = stripCitationTags(signal.summary?.trim() ?? "");
    const whyItMatters = stripCitationTags(signal.whyItMatters?.trim() ?? "");
    const sourceUrl = stripCitationTags(signal.sourceUrl?.trim() ?? "");
    const sourceTitle = stripCitationTags(signal.sourceTitle?.trim() ?? "");

    if (!headline || !summary || !whyItMatters || !sourceUrl || !sourceTitle) continue;
    if (!/^https?:\/\//i.test(sourceUrl)) continue;

    const tier = signal.tier === 1 || signal.tier === 2 ? signal.tier : expectedTier(type);
    const occurredAt = typeof signal.occurredAt === "string" && signal.occurredAt.trim()
      ? signal.occurredAt.trim()
      : null;

    results.push({
      id: randomUUID(),
      type,
      tier,
      headline,
      summary,
      whyItMatters,
      sourceUrl,
      sourceTitle,
      occurredAt,
      scannedAt,
    });

    if (results.length >= 5) break;
  }

  return results;
}

function sectorPackLabel(yourCompany?: YourCompanyInput): string {
  const composed = composeAccountBriefPrompt(yourCompany);
  if (composed.researchPack) {
    return `${composed.researchPack.name} v${composed.researchPack.version}`;
  }
  if (composed.sectorPackSelection.mode === "legacy") {
    return "Default research plan";
  }
  return "Default research plan";
}

router.post("/signals/scan", async (req, res): Promise<void> => {
  const { company, brief, yourCompany, sectorPackOverride } = req.body as {
    company?: string;
    brief?: Record<string, unknown>;
    yourCompany?: YourCompanyInput;
    sectorPackOverride?: string;
  };

  const companyName = company?.trim();
  if (!companyName) {
    res.status(400).json({ error: "company is required" });
    return;
  }

  if (!yourCompany || typeof yourCompany !== "object") {
    res.status(400).json({ error: "yourCompany is required" });
    return;
  }

  const sellerContext: YourCompanyInput = {
    ...yourCompany,
    sectorPackOverride: sectorPackOverride?.trim() || yourCompany.sectorPackOverride,
  };

  const composed = composeAccountBriefPrompt(sellerContext);
  const scannedAt = new Date().toISOString();

  req.log.info({ company: companyName, sectorPack: sectorPackLabel(sellerContext) }, "Scanning account signals");

  const systemPrompt = [
    composed.systemPrompt,
    SIGNAL_SCAN_FORMAT,
    buildYourCompanyContext(sellerContext),
  ].join("\n\n");

  const briefBlock = brief && typeof brief === "object"
    ? `\n\nExisting research brief for context:\n${JSON.stringify(brief, null, 2)}`
    : "";

  const userMessage = `Target account: ${companyName}

Run ONE web search sweep for Tier 1 and Tier 2 buying signals from the last 90 days at this account.${briefBlock}

Return ONLY the JSON object — no other text.`;

  try {
    const result = await callClaudeJsonWithSearch(
      client,
      systemPrompt,
      userMessage,
      2500,
      composed.timeoutMs,
    );

    const signals = normaliseSignals(result, scannedAt);

    res.json({
      signals,
      scannedAt,
      sectorPackUsed: sectorPackLabel(sellerContext),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err, company: companyName }, message);
    res.status(500).json({ error: message });
  }
});

router.post("/signal-opener", async (req, res): Promise<void> => {
  const { signal, brief, yourCompany, tone } = req.body as {
    signal?: Record<string, unknown>;
    brief?: Record<string, unknown>;
    yourCompany?: YourCompanyInput;
    tone?: EmailTone;
  };

  if (!signal || typeof signal !== "object") {
    res.status(400).json({ error: "signal is required" });
    return;
  }

  if (!yourCompany || typeof yourCompany !== "object") {
    res.status(400).json({ error: "yourCompany is required" });
    return;
  }

  const emailTone = tone ?? "direct";
  const headline = typeof signal.headline === "string" ? signal.headline : "recent signal";

  req.log.info({ headline, tone: emailTone }, "Generating signal opener");

  const system = `You are a senior B2B AE writing cold outreach anchored on a recent buying signal.
Return ONLY valid JSON with this exact shape:
{ "opener": "..." }

Rules for opener:
- Open with a specific reference to the signal — not a generic compliment
- Tie the signal to what WE sell and the value we deliver for this ICP
- Propose one concrete next step (brief call, share a resource, etc.)
- 2–4 sentences max; plain text only; no subject line
- Honour the ${emailTone.toUpperCase()} tone${buildEmailToneInstruction(emailTone)}${buildYourCompanyContext(yourCompany)}`;

  const briefBlock = brief && typeof brief === "object"
    ? `\n\nResearch brief for this account:\n${JSON.stringify(brief, null, 2)}`
    : "";

  try {
    const result = await callClaudeJson(
      client,
      system,
      `Buying signal:\n${JSON.stringify(signal, null, 2)}${briefBlock}\n\nReturn ONLY the JSON object.`,
      800,
      30000,
      0.85,
    ) as { opener?: string };

    const opener = stripCitationTags(result.opener?.trim() ?? "");
    if (!opener) {
      res.status(500).json({ error: "Failed to generate opener. Please try again." });
      return;
    }

    res.json({
      opener,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err, headline, tone: emailTone }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
