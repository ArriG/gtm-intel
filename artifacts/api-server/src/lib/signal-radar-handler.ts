import type { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db, icpsTable, signalsTable } from "@workspace/db";
import { RunSignalRadarResponse } from "@workspace/api-zod";
import {
  buildIcpRadarContext,
  buildYourCompanyRadarContext,
  yourCompanyHasRadarContext,
  callClaudeJsonWithSearch,
  type YourCompanyInput,
} from "./brief-ai";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SIGNAL_TYPES = new Set([
  "pricing_change", "product_launch", "funding", "hiring", "partnership", "other",
]);
const IMPORTANCE_LEVELS = new Set(["high", "medium", "low"]);

function parseSignal(row: typeof signalsTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

type RawRadarSignal = {
  title?: string;
  description?: string;
  type?: string;
  source?: string;
  importance?: string;
  companyName?: string;
  companyDomain?: string;
  icpName?: string;
  icpId?: number;
};

function normalizeRadarSignal(raw: RawRadarSignal, icps: typeof icpsTable.$inferSelect[]) {
  if (!raw.title?.trim() || !raw.source?.trim()) return null;

  const type = SIGNAL_TYPES.has(raw.type ?? "") ? raw.type! : "other";
  const importance = IMPORTANCE_LEVELS.has(raw.importance ?? "") ? raw.importance! : "medium";

  let icpId = typeof raw.icpId === "number" ? raw.icpId : undefined;
  let icpName = raw.icpName?.trim() || undefined;

  if (icpName && !icpId) {
    const match = icps.find(i => i.name.toLowerCase() === icpName!.toLowerCase());
    if (match) icpId = match.id;
  }
  if (icpId && !icpName) {
    const match = icps.find(i => i.id === icpId);
    if (match) icpName = match.name;
  }

  return {
    title: raw.title.trim(),
    description: raw.description?.trim() || null,
    type,
    source: raw.source.trim(),
    importance,
    companyName: raw.companyName?.trim() || null,
    companyDomain: raw.companyDomain?.trim() || null,
    icpName: icpName || null,
    icpId: icpId ?? null,
    reviewed: false,
  };
}

export async function handleSignalRadar(req: Request, res: Response): Promise<void> {
  const { yourCompany } = req.body as { yourCompany?: YourCompanyInput };

  const icps = await db.select().from(icpsTable);
  const hasIcps = icps.length > 0;
  const hasSeller = yourCompanyHasRadarContext(yourCompany);

  if (!hasIcps && !hasSeller) {
    res.status(400).json({
      error: "Fill out Your Company (who you sell to) or define at least one ICP before running the radar.",
    });
    return;
  }

  req.log.info({ icpCount: icps.length, hasSeller }, "Signal radar scan");

  const sellerContext = buildYourCompanyRadarContext(yourCompany);
  const icpContext = hasIcps ? buildIcpRadarContext(icps) : "";

  const matchRule = hasIcps && hasSeller
    ? "Each signal must fit the seller's target industry AND align with at least one defined ICP — cite which in icpName/icpId"
    : hasIcps
      ? "Each signal must match at least one defined ICP — cite which in icpName/icpId"
      : "Each signal must be a company in the seller's target industry/market — set icpName to a short label for the target market";

  const system = `You are a GTM signal radar analyst specialising in Australian B2B markets.

Search the web for RECENT buying signals (last 30–90 days) at real companies that match the seller's industry and buyer profile below. Surface prospecting opportunities — not generic industry news.

Return ONLY valid JSON:
{
  "signals": [
    {
      "title": "Short headline, e.g. Acme Corp hiring 5 SDRs on Seek",
      "description": "Why this is a prospecting opportunity for the seller — tie to their target market and pain points",
      "type": "funding | hiring | product_launch | partnership | pricing_change | other",
      "source": "Where found, e.g. Seek, AFR, LinkedIn, company blog",
      "importance": "high | medium | low",
      "companyName": "Prospect company name",
      "companyDomain": "company.com.au",
      "icpName": "Matching ICP name or target market label",
      "icpId": 1
    }
  ]
}

Sources to search (AU focus):
1. Seek job postings — hiring spikes signal budget and pain
2. AFR / SmartCompany / fintech.com.au — funding, leadership, expansion
3. LinkedIn C-suite posts — strategic priorities
4. Company blogs and press releases — product launches, partnerships

Rules:
- Return 5–8 real signals from verifiable companies (minimum 3 if sparse results)
- ${matchRule}
- importance "high" = strong industry fit + timely trigger (funding, hiring spike, expansion)
- Domains must be real — verify via web search
- No made-up companies or events
- CRITICAL: Do not write preamble or markdown. Raw JSON only.

${sellerContext}${icpContext ? `\n\n${icpContext}` : ""}`;

  const userMessage = hasSeller
    ? `Scan the web for recent buying signals at companies in this target market: "${yourCompany!.whoYouSellTo?.trim() || yourCompany!.whatYouSell!.trim()}". Focus on Australia. Respond with ONLY the JSON object.`
    : "Scan the web for recent ICP-matching buying signals in Australia. Respond with ONLY the JSON object.";

  try {
    const result = await callClaudeJsonWithSearch(
      client,
      system,
      userMessage,
      3500,
      60000,
    ) as { signals?: RawRadarSignal[] };

    const normalized = (result.signals ?? [])
      .map(s => normalizeRadarSignal(s, icps))
      .filter((s): s is NonNullable<typeof s> => s !== null);

    if (normalized.length === 0) {
      res.json(RunSignalRadarResponse.parse({ signals: [], added: 0 }));
      return;
    }

    const rows = await db.insert(signalsTable).values(normalized).returning();
    const signals = rows.map(parseSignal);

    res.json(RunSignalRadarResponse.parse({ signals, added: signals.length }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Radar scan failed";
    req.log.error({ err }, message);
    res.status(500).json({ error: message });
  }
}
