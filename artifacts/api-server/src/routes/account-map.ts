import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildYourCompanyContext,
  parseJsonFromResponse,
  textFromMessageContent,
  yourCompanyHasContext,
  type YourCompanyInput,
} from "../lib/brief-ai";
import {
  LEADERSHIP_ENRICH_CAP,
  mergeLeadershipOntoStructure,
  selectEntitiesForLeadership,
} from "../lib/account-map-merge";
import { normalizeAccountMap } from "../lib/account-map-normalize";
import { ACCOUNT_MAP_PEOPLE_FORMAT } from "../prompts/account-map-people-format";
import { ACCOUNT_MAP_STRUCTURE_FORMAT } from "../prompts/account-map-structure-format";
import { loadConstitution, loadPackByName } from "../prompts/pack-loader";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Never auto-retry mapping calls — each retry is a full, expensive web-search run.
  maxRetries: 0,
});

const MAPPING_PACK_ID = "european-financial-services";
const DEFAULT_MAPPING_MODEL = "claude-sonnet-4-6";
/** Revert Mapping to Haiku: MAPPING_MODEL=claude-haiku-4-5-20251001 */
const MAPPING_MODEL =
  process.env.MAPPING_MODEL?.trim() || DEFAULT_MAPPING_MODEL;
const PASS_2_MODEL =
  process.env.MAPPING_PASS_2_MODEL?.trim() || MAPPING_MODEL;

export type MapRegion = "emea" | "apac" | "north_america" | "latam";

const DEFAULT_REGION: MapRegion = "emea";

type RegionScope = {
  label: string;
  sourceHint: string;
};

/** Region scopes narrow the search target — the AE picks one per map. */
const REGION_SCOPES: Record<MapRegion, RegionScope> = {
  emea: {
    label: "EMEA (Europe, Middle East & Africa)",
    sourceHint:
      "Prioritise EMEA regulators and filings: Companies House/FCA/PRA (UK), BaFin/Handelsregister (DE), FINMA/Zefix (CH), ACPR/AMF (FR), DNB/AFM (NL), IVASS (IT), DGSFP (ES), Irish CRO, EIOPA, DFSA (Dubai), FSCA (South Africa), plus local annual reports.",
  },
  apac: {
    label: "Asia-Pacific",
    sourceHint:
      "Prioritise Asia-Pacific regulators and filings: APRA (AU), MAS (SG), FSA (JP), HKIA (HK), IRDAI (IN), and local annual reports and investor relations pages.",
  },
  north_america: {
    label: "North America (US & Canada)",
    sourceHint:
      "Prioritise North American sources: SEC EDGAR, NAIC, US state insurance department filings, OSFI (Canada), and US/CA annual reports and investor relations pages.",
  },
  latam: {
    label: "Latin America",
    sourceHint:
      "Prioritise Latin American regulators and filings: SUSEP (Brazil), CNSF (Mexico), CMF (Chile), SBS (Peru), Superintendencia Financiera (Colombia), and local annual reports and investor relations pages.",
  },
};

function normalizeRegion(value: unknown): MapRegion {
  return value === "emea" ||
    value === "apac" ||
    value === "north_america" ||
    value === "latam"
    ? value
    : DEFAULT_REGION;
}

function regionScopeInstruction(region: MapRegion): string {
  const scope = REGION_SCOPES[region];
  return [
    `REGION SCOPE: ${scope.label}.`,
    `Map ONLY ${scope.label} operating entities in full depth in entities[].`,
    `For entities in OTHER regions, list their NAMES ONLY in unmappedEntities[] — no detail, no leaders.`,
    scope.sourceHint,
  ].join("\n");
}
/** Hard cap for the whole request — must stay under client abort (see account-brief.tsx). */
const MAPPING_TIMEOUT_MS = 215_000;
const PASS_1_TIMEOUT_MS = 120_000;
const PASS_2_TIMEOUT_MS = 90_000;
/** Need at least this much left on the clock before starting pass 2. */
const PASS_2_MIN_REMAINING_MS = 15_000;
const PASS_1_MAX_TOKENS = 8000;
const PASS_2_MAX_TOKENS = 4000;
/** Hard server-side cap on web searches per pass — fewer searches = faster finish inside timeout. */
const PASS_1_MAX_SEARCHES = 3;
/** Pass 2: ~1 focused search per enriched entity, clamped to keep cost tight. */
const PASS_2_MIN_SEARCHES = 3;
const PASS_2_MAX_SEARCHES = 5;
/**
 * Safety switch: set MAP_STRUCTURE_ONLY=1 (or true) to skip the Pass 2 leadership
 * enrichment entirely. Pass 1 alone is the cheapest possible map — use this for a
 * low-cost smoke test before re-enabling the full two-pass run.
 */
const STRUCTURE_ONLY =
  process.env.MAP_STRUCTURE_ONLY === "1" ||
  process.env.MAP_STRUCTURE_ONLY?.toLowerCase() === "true";

/** Logged once at server boot — confirm Replit pulled latest code after restart. */
export const ACCOUNT_MAP_RUNTIME_CONFIG = {
  mappingTimeoutMs: MAPPING_TIMEOUT_MS,
  pass1: { timeoutMs: PASS_1_TIMEOUT_MS, maxSearches: PASS_1_MAX_SEARCHES },
  pass2: {
    timeoutMs: PASS_2_TIMEOUT_MS,
    minSearches: PASS_2_MIN_SEARCHES,
    maxSearches: PASS_2_MAX_SEARCHES,
    searchesPerEntity: true,
  },
  leadershipEnrichCap: LEADERSHIP_ENRICH_CAP,
  structureOnly: STRUCTURE_ONLY,
  pass1Model: MAPPING_MODEL,
  pass2Model: PASS_2_MODEL,
} as const;

function logAccountMapConfigAtBoot(): void {
  console.info(
    "[account-map] runtime config",
    JSON.stringify(ACCOUNT_MAP_RUNTIME_CONFIG),
  );
}

logAccountMapConfigAtBoot();

function mappingPassError(err: unknown): Error {
  const name = (err as { name?: string })?.name ?? "";
  const message = err instanceof Error ? err.message : String(err);
  if (
    name === "APIConnectionTimeoutError" ||
    name === "APIUserAbortError" ||
    /timed?\s?out|aborted/i.test(message)
  ) {
    return new Error(
      "Mapping timed out before finishing. Try again, or set MAP_STRUCTURE_ONLY=1 on the server for a faster structure-only map.",
    );
  }
  return err instanceof Error ? err : new Error(message);
}

function composeStructurePrompt(
  yourCompany: YourCompanyInput,
  region: MapRegion,
): { systemPrompt: string; sectorPackUsed: string } {
  const constitution = loadConstitution();
  const pack = loadPackByName(MAPPING_PACK_ID);

  if (!pack) {
    throw new Error(`Sector pack "${MAPPING_PACK_ID}" not found`);
  }

  const sourceBlock = `${pack.body}

When mapping a global enterprise, follow the European Financial Services sector pack above for European entities. Use public web search for non-European regions with the same verification standard.`;

  const systemPrompt = [
    "You are a world-class enterprise research analyst producing factual account maps.",
    "",
    constitution,
    "",
    sourceBlock,
    buildYourCompanyContext(yourCompany),
    "",
    regionScopeInstruction(region),
    "PASS 1 — STRUCTURE ONLY: Do not search for named executives. Return buyers: [] on every entity.",
    `SPEED INSTRUCTION: Complete this structure pass within 100 seconds using at most ${PASS_1_MAX_SEARCHES} web searches. Prioritise subsidiary discovery and group context — stop searching once you have solid entity coverage.`,
    ACCOUNT_MAP_STRUCTURE_FORMAT,
  ].filter(Boolean).join("\n\n");

  return {
    systemPrompt,
    sectorPackUsed: MAPPING_PACK_ID,
  };
}

function composePeoplePrompt(yourCompany: YourCompanyInput, maxSearches: number): string {
  const pack = loadPackByName(MAPPING_PACK_ID);
  const leadershipBlock = pack
    ? `Apply the sector pack leadership guidance and role aliases below.\n\n${pack.body}`
    : "";

  return [
    "You are a specialist in verifying named insurance and financial services executives from public sources.",
    leadershipBlock,
    buildYourCompanyContext(yourCompany),
    "",
    "PASS 2 — LEADERSHIP ONLY: Find named, sourced executives per entity. Never invent names.",
    `SPEED INSTRUCTION: Complete within 80 seconds using at most ${maxSearches} web searches — roughly one focused search per entity in this batch.`,
    ACCOUNT_MAP_PEOPLE_FORMAT,
  ].filter(Boolean).join("\n\n");
}

async function callMappingPass(
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number,
  maxSearches: number,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  // RequestOptions (signal/timeout/maxRetries) MUST be the second arg — passing
  // them in the body is silently ignored and leaves the request running (and billing).
  let message: Anthropic.Message;
  try {
    message = await client.messages.create(
      {
        model,
        max_tokens: maxTokens,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches } as any],
        system,
        messages: [{ role: "user", content: userMessage }],
      },
      {
        timeout: timeoutMs,
        maxRetries: 0,
      },
    );
  } catch (err) {
    throw mappingPassError(err);
  }

  const responseText = textFromMessageContent(message.content);
  if (!responseText) {
    throw new Error("No response generated. Please try again.");
  }

  return parseJsonFromResponse(responseText) as Record<string, unknown>;
}

function buildPeopleUserMessage(
  companyName: string,
  targets: Array<Record<string, unknown>>,
): string {
  const entityLines = targets.map((e, i) => {
    const parts = [
      `${i + 1}. ${e.name}`,
      `   Country: ${e.country}`,
      `   Region: ${e.region}`,
      `   Business line: ${e.businessLine}`,
      `   Fit: ${e.fitTier}`,
    ];
    if (e.context) parts.push(`   Context: ${e.context}`);
    return parts.join("\n");
  });

  return `Parent group: ${companyName}

Find named leadership for ONLY these ${targets.length} operating entities (return the same names exactly):

${entityLines.join("\n\n")}

Return ONLY the JSON object — no other text.`;
}

router.post("/account-map", async (req, res): Promise<void> => {
  const { company, region: rawRegion, yourCompany } = req.body as {
    company?: string;
    region?: string;
    yourCompany?: YourCompanyInput;
  };

  const companyName = company?.trim();
  if (!companyName) {
    res.status(400).json({ error: "company is required" });
    return;
  }

  if (!yourCompanyHasContext(yourCompany)) {
    res.status(400).json({ error: "yourCompany is required" });
    return;
  }

  const region = normalizeRegion(rawRegion);

  req.log.info(
    { company: companyName, region, config: ACCOUNT_MAP_RUNTIME_CONFIG },
    STRUCTURE_ONLY
      ? "Generating account map (structure-only)"
      : "Generating account map (two-pass)",
  );

  let composed: { systemPrompt: string; sectorPackUsed: string };
  try {
    composed = composeStructurePrompt(yourCompany!, region);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load mapping sector pack";
    req.log.error({ err }, message);
    res.status(500).json({ error: message });
    return;
  }

  const generatedAt = new Date().toISOString();
  const deadline = Date.now() + MAPPING_TIMEOUT_MS;

  try {
    const pass1Timeout = Math.min(PASS_1_TIMEOUT_MS, deadline - Date.now());
    const scopeLine = `Focus the full-depth map on ${REGION_SCOPES[region].label}. List other-region entities by name only in unmappedEntities[].`;
    const structureRaw = await callMappingPass(
      MAPPING_MODEL,
      composed.systemPrompt,
      `Map the enterprise structure for: ${companyName}

${scopeLine} Do NOT return named executives — buyers must be [] on every entity.
Return ONLY the JSON object — no other text.`,
      PASS_1_MAX_TOKENS,
      PASS_1_MAX_SEARCHES,
      pass1Timeout,
    );

    const rawEntities = Array.isArray(structureRaw.entities)
      ? structureRaw.entities as Array<Record<string, unknown>>
      : [];

    const enrichTargets = STRUCTURE_ONLY
      ? []
      : selectEntitiesForLeadership(rawEntities, LEADERSHIP_ENRICH_CAP);
    let merged = structureRaw;

    if (STRUCTURE_ONLY) {
      req.log.info(
        { company: companyName },
        "MAP_STRUCTURE_ONLY enabled — skipping pass 2 leadership enrichment",
      );
    }

    const remainingMs = deadline - Date.now();
    if (enrichTargets.length > 0 && remainingMs > PASS_2_MIN_REMAINING_MS) {
      const pass2Timeout = Math.min(PASS_2_TIMEOUT_MS, remainingMs);
      const pass2Searches = Math.min(
        Math.max(enrichTargets.length, PASS_2_MIN_SEARCHES),
        PASS_2_MAX_SEARCHES,
      );
      try {
        const peopleRaw = await callMappingPass(
          PASS_2_MODEL,
          composePeoplePrompt(yourCompany!, pass2Searches),
          buildPeopleUserMessage(companyName, enrichTargets),
          PASS_2_MAX_TOKENS,
          pass2Searches,
          pass2Timeout,
        );
        merged = mergeLeadershipOntoStructure(structureRaw, peopleRaw);
        req.log.info(
          { company: companyName, enriched: enrichTargets.length, pass2Searches },
          "Account map pass 2 leadership merge complete",
        );
      } catch (pass2Err) {
        req.log.warn(
          { err: pass2Err, company: companyName },
          "Pass 2 leadership enrichment failed — returning structure-only map",
        );
      }
    } else if (enrichTargets.length > 0) {
      req.log.warn(
        { company: companyName, remainingMs },
        "Skipping pass 2 — insufficient time remaining after structure pass",
      );
    }

    const normalized = normalizeAccountMap(merged, generatedAt, composed.sectorPackUsed);
    res.json(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err, company: companyName }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
