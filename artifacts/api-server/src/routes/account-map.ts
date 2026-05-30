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
  mergeLeadershipOntoStructure,
  selectEntitiesForLeadership,
} from "../lib/account-map-merge";
import { applyRegionScopeToRaw, type MapRequestRegion } from "../lib/account-map-scope";
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

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

type RegionUserLocation = {
  city: string;
  region: string;
  country: string;
  timezone: string;
};

type RegionScope = {
  label: string;
  sourceHint: string;
  userLocation: RegionUserLocation;
  /** Scheme-less domains for Pass 2 when MAP_DOMAIN_FILTER=1 */
  allowedDomains: string[];
};

/** Global anchors appended to every region allowlist (Pass 2 domain filter). */
const GLOBAL_DOMAIN_ANCHORS = [
  "wikipedia.org",
  "annualreports.com",
  "annualreport.com",
] as const;

function regionAllowedDomains(regulatorDomains: string[]): string[] {
  return [...new Set([...GLOBAL_DOMAIN_ANCHORS, ...regulatorDomains])];
}

/** Per-region allowlists for boot log (scheme-less). */
const ALLOWED_DOMAINS_BY_REGION: Record<MapRegion, string[]> = {
  emea: [],
  apac: [],
  north_america: [],
  latam: [],
};

/** Region scopes narrow the search target — the AE picks one per map. */
const REGION_SCOPES: Record<MapRegion, RegionScope> = {
  emea: {
    label: "EMEA (Europe, Middle East & Africa)",
    sourceHint:
      "Prioritise EMEA regulators and filings: Companies House/FCA/PRA (UK), BaFin/Handelsregister (DE), FINMA/Zefix (CH), ACPR/AMF (FR), DNB/AFM (NL), IVASS (IT), DGSFP (ES), Irish CRO, EIOPA, DFSA (Dubai), FSCA (South Africa), plus local annual reports.",
    userLocation: {
      city: "London",
      region: "England",
      country: "GB",
      timezone: "Europe/London",
    },
    allowedDomains: regionAllowedDomains([
      "companieshouse.gov.uk",
      "fca.org.uk",
      "bankofengland.co.uk",
      "bafin.de",
      "bundesanzeiger.de",
      "handelsregister.de",
      "finma.ch",
      "zefix.ch",
      "banque-france.fr",
      "amf-france.org",
      "dnb.nl",
      "afm.nl",
      "ivass.it",
      "dgsfp.mineco.gob.es",
      "cro.ie",
      "eiopa.europa.eu",
      "dfsa.ae",
      "fsca.co.za",
    ]),
  },
  apac: {
    label: "Asia-Pacific",
    sourceHint:
      "Prioritise Asia-Pacific regulators and filings: APRA (AU), MAS (SG), FSA (JP), HKIA (HK), IRDAI (IN), and local annual reports and investor relations pages.",
    userLocation: {
      city: "Singapore",
      region: "Singapore",
      country: "SG",
      timezone: "Asia/Singapore",
    },
    allowedDomains: regionAllowedDomains([
      "apra.gov.au",
      "mas.gov.sg",
      "fsa.go.jp",
      "hkma.gov.hk",
      "irdai.gov.in",
    ]),
  },
  north_america: {
    label: "North America (US & Canada)",
    sourceHint:
      "Prioritise North American sources: SEC EDGAR, NAIC, US state insurance department filings, OSFI (Canada), and US/CA annual reports and investor relations pages.",
    userLocation: {
      city: "New York",
      region: "New York",
      country: "US",
      timezone: "America/New_York",
    },
    allowedDomains: regionAllowedDomains([
      "sec.gov",
      "naic.org",
      "osfi-bsif.gc.ca",
      "sedarplus.ca",
    ]),
  },
  latam: {
    label: "Latin America",
    sourceHint:
      "Prioritise Latin American regulators and filings: SUSEP (Brazil), CNSF (Mexico), CMF (Chile), SBS (Peru), Superintendencia Financiera (Colombia), and local annual reports and investor relations pages.",
    userLocation: {
      city: "São Paulo",
      region: "São Paulo",
      country: "BR",
      timezone: "America/Sao_Paulo",
    },
    allowedDomains: regionAllowedDomains([
      "susep.gov.br",
      "cnsf.gob.mx",
      "cmfchile.cl",
      "sbs.gob.pe",
      "superfinanciera.gov.co",
    ]),
  },
};

for (const region of Object.keys(REGION_SCOPES) as MapRegion[]) {
  ALLOWED_DOMAINS_BY_REGION[region] = REGION_SCOPES[region].allowedDomains;
}

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
const MAPPING_TIMEOUT_MS = envInt("MAPPING_TIMEOUT_MS", 225_000);
const PASS_1_TIMEOUT_MS = envInt("PASS_1_TIMEOUT_MS", 120_000);
const PASS_2_TIMEOUT_MS = envInt("PASS_2_TIMEOUT_MS", 105_000);
/** Need at least this much left on the clock before starting pass 2. */
const PASS_2_MIN_REMAINING_MS = envInt("PASS_2_MIN_REMAINING_MS", 15_000);
const PASS_1_MAX_TOKENS = 8000;
const PASS_2_MAX_TOKENS = 4000;
/** Hard server-side cap on web searches per pass — fewer searches = faster finish inside timeout. */
const PASS_1_MAX_SEARCHES = envInt("PASS_1_MAX_SEARCHES", 3);
/** Pass 2: ~1 focused search per enriched entity, clamped to keep cost tight. */
const PASS_2_MIN_SEARCHES = envInt("PASS_2_MIN_SEARCHES", 3);
const PASS_2_MAX_SEARCHES = envInt("PASS_2_MAX_SEARCHES", 8);
const LEADERSHIP_ENRICH_CAP = envInt("LEADERSHIP_ENRICH_CAP", 8);
/**
 * When MAP_DOMAIN_FILTER=1, Pass 2 web_search uses per-region allowed_domains
 * (regulator + anchor sites). Default off — A/B against baseline first.
 */
const MAP_DOMAIN_FILTER =
  process.env.MAP_DOMAIN_FILTER === "1" ||
  process.env.MAP_DOMAIN_FILTER?.toLowerCase() === "true";
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
    minRemainingMs: PASS_2_MIN_REMAINING_MS,
    searchesPerEntity: true,
    domainFilter: MAP_DOMAIN_FILTER,
    allowedDomainsByRegion: ALLOWED_DOMAINS_BY_REGION,
  },
  leadershipEnrichCap: LEADERSHIP_ENRICH_CAP,
  structureOnly: STRUCTURE_ONLY,
  pass1Model: MAPPING_MODEL,
  pass2Model: PASS_2_MODEL,
} as const;

export type AccountMapPassMeta = {
  model: string;
  maxSearches: number;
  searchesUsed: number;
  elapsedMs: number;
  allowedDomains?: boolean;
};

export type AccountMapResponseMeta = {
  region: MapRegion;
  totalElapsedMs: number;
  entityCount: number;
  sourcedLeaderCount: number;
  pass2Status:
    | "structure_only"
    | "skipped_insufficient_time"
    | "completed"
    | "failed"
    | "not_needed";
  pass1: AccountMapPassMeta;
  pass2?: AccountMapPassMeta;
  domainFilterEnabled: boolean;
};

function countWebSearchUses(content: Anthropic.Message["content"]): number {
  let count = 0;
  for (const block of content) {
    if (
      block.type === "server_tool_use" &&
      "name" in block &&
      block.name === "web_search"
    ) {
      count += 1;
    }
  }
  return count;
}

function buildWebSearchTool(
  maxUses: number,
  region: MapRegion,
  allowedDomains?: string[],
): Record<string, unknown> {
  const scope = REGION_SCOPES[region];
  const tool: Record<string, unknown> = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: maxUses,
    user_location: {
      type: "approximate",
      city: scope.userLocation.city,
      region: scope.userLocation.region,
      country: scope.userLocation.country,
      timezone: scope.userLocation.timezone,
    },
  };
  if (allowedDomains && allowedDomains.length > 0) {
    tool.allowed_domains = allowedDomains;
  }
  return tool;
}

function countSourcedLeaders(entities: unknown): number {
  if (!Array.isArray(entities)) return 0;
  let count = 0;
  for (const entity of entities) {
    if (!entity || typeof entity !== "object") continue;
    const buyers = (entity as { buyers?: unknown }).buyers;
    if (!Array.isArray(buyers)) continue;
    for (const buyer of buyers) {
      if (
        buyer &&
        typeof buyer === "object" &&
        typeof (buyer as { sourceUrl?: unknown }).sourceUrl === "string" &&
        (buyer as { sourceUrl: string }).sourceUrl.trim()
      ) {
        count += 1;
      }
    }
  }
  return count;
}

function logAccountMapConfigAtBoot(): void {
  console.info(
    "[account-map] runtime config",
    JSON.stringify(ACCOUNT_MAP_RUNTIME_CONFIG),
  );
}

logAccountMapConfigAtBoot();

function mappingPassError(err: unknown, passLabel: "Pass 1 (structure)" | "Pass 2 (leadership)"): Error {
  const name = (err as { name?: string })?.name ?? "";
  const message = err instanceof Error ? err.message : String(err);
  if (
    name === "APIConnectionTimeoutError" ||
    name === "APIUserAbortError" ||
    /timed?\s?out|aborted/i.test(message)
  ) {
    const hint =
      passLabel === "Pass 1 (structure)"
        ? "Structure discovery hit the search deadline — often caused by slow PDF/regulator sources. Try again, or set MAP_STRUCTURE_ONLY=1 for a faster structure-only smoke test."
        : "Leadership enrichment timed out — you may still get a structure-only map on retry if Pass 1 finishes faster.";
    return new Error(`${passLabel} timed out. ${hint}`);
  }
  return err instanceof Error ? err : new Error(message);
}

/** Pass 1 only needs subsidiary/structure guidance — not leadership search aliases. */
function structurePackExcerpt(packBody: string): string {
  const leadershipStart = packBody.search(/^## Common European insurance buyer titles/m);
  if (leadershipStart > 0) {
    return packBody.slice(0, leadershipStart).trim();
  }
  return packBody.trim();
}

function pass1SearchRules(region: MapRegion): string {
  const scope = REGION_SCOPES[region];
  return [
    "PASS 1 SEARCH RULES (strict — Pass 2 handles leadership and regulator deep-dives):",
    `- Spend every web search on ${scope.label} only — regulators and filings listed in REGION SCOPE (not US/APAC/LATAM structure unless that is the selected scope).`,
    "- Use broad in-scope queries only: regional annual report subsidiary list, in-scope investor relations, in-scope regulator group pages.",
    "- Do NOT open or fetch PDF filings, SFCR documents, or regulator register exports in this pass — Pass 2 only.",
    "- Do NOT run web searches solely to fill outreachSources[] or companySnapshot — use known facts and URLs from searches you already ran.",
    "- Do NOT search for out-of-scope regions; list those entity names only in unmappedEntities[] without searching.",
    "- Stop searching as soon as you have solid in-scope entity coverage; return JSON immediately.",
  ].join("\n");
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

  const sourceBlock = `${structurePackExcerpt(pack.body)}

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
    pass1SearchRules(region),
    `SPEED INSTRUCTION: Complete this structure pass within 90 seconds using at most ${PASS_1_MAX_SEARCHES} web searches. Prioritise subsidiary discovery — stop searching once you have solid entity coverage and return JSON.`,
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

type MappingPassResult = {
  raw: Record<string, unknown>;
  searchesUsed: number;
  elapsedMs: number;
};

async function callMappingPass(
  passLabel: "Pass 1 (structure)" | "Pass 2 (leadership)",
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number,
  maxSearches: number,
  timeoutMs: number,
  region: MapRegion,
  allowedDomains?: string[],
): Promise<MappingPassResult> {
  const startedAt = Date.now();
  // RequestOptions (signal/timeout/maxRetries) MUST be the second arg — passing
  // them in the body is silently ignored and leaves the request running (and billing).
  let message: Anthropic.Message;
  try {
    message = await client.messages.create(
      {
        model,
        max_tokens: maxTokens,
        tools: [buildWebSearchTool(maxSearches, region, allowedDomains) as any],
        system,
        messages: [{ role: "user", content: userMessage }],
      },
      {
        timeout: timeoutMs,
        maxRetries: 0,
      },
    );
  } catch (err) {
    console.warn(
      `[account-map] ${passLabel} failed after ${Date.now() - startedAt}ms`,
      err instanceof Error ? err.message : err,
    );
    throw mappingPassError(err, passLabel);
  }

  const elapsedMs = Date.now() - startedAt;
  const searchesUsed = countWebSearchUses(message.content);
  const responseText = textFromMessageContent(message.content);
  if (!responseText) {
    throw new Error("No response generated. Please try again.");
  }

  console.info(
    `[account-map] ${passLabel} complete in ${elapsedMs}ms searches=${searchesUsed}/${maxSearches}`,
  );
  return {
    raw: parseJsonFromResponse(responseText) as Record<string, unknown>,
    searchesUsed,
    elapsedMs,
  };
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
  const requestStartedAt = Date.now();
  let pass2Status: AccountMapResponseMeta["pass2Status"] = "not_needed";
  let pass2Meta: AccountMapPassMeta | undefined;

  try {
    const pass1Timeout = Math.min(PASS_1_TIMEOUT_MS, deadline - Date.now());
    const scopeLine = `Focus the full-depth map on ${REGION_SCOPES[region].label}. List other-region entities by name only in unmappedEntities[].`;
    req.log.info(
      { company: companyName, pass1TimeoutMs: pass1Timeout, pass1MaxSearches: PASS_1_MAX_SEARCHES },
      "Account map pass 1 starting",
    );
    const pass1 = await callMappingPass(
      "Pass 1 (structure)",
      MAPPING_MODEL,
      composed.systemPrompt,
      `Map the enterprise structure for: ${companyName}

${scopeLine} Do NOT return named executives — buyers must be [] on every entity.
Return ONLY the JSON object — no other text.`,
      PASS_1_MAX_TOKENS,
      PASS_1_MAX_SEARCHES,
      pass1Timeout,
      region,
    );
    const structureRaw = pass1.raw;
    const pass1Meta: AccountMapPassMeta = {
      model: MAPPING_MODEL,
      maxSearches: PASS_1_MAX_SEARCHES,
      searchesUsed: pass1.searchesUsed,
      elapsedMs: pass1.elapsedMs,
    };

    const rawEntities = Array.isArray(structureRaw.entities)
      ? structureRaw.entities as Array<Record<string, unknown>>
      : [];

    const enrichTargets = STRUCTURE_ONLY
      ? []
      : selectEntitiesForLeadership(rawEntities, LEADERSHIP_ENRICH_CAP);
    let merged = structureRaw;

    if (STRUCTURE_ONLY) {
      pass2Status = "structure_only";
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
      const pass2AllowedDomains = MAP_DOMAIN_FILTER
        ? REGION_SCOPES[region].allowedDomains
        : undefined;
      req.log.info(
        {
          company: companyName,
          pass2TimeoutMs: pass2Timeout,
          pass2Searches,
          remainingMs,
          enrichTargets: enrichTargets.length,
          domainFilter: MAP_DOMAIN_FILTER,
        },
        "Account map pass 2 starting",
      );
      try {
        const pass2 = await callMappingPass(
          "Pass 2 (leadership)",
          PASS_2_MODEL,
          composePeoplePrompt(yourCompany!, pass2Searches),
          buildPeopleUserMessage(companyName, enrichTargets),
          PASS_2_MAX_TOKENS,
          pass2Searches,
          pass2Timeout,
          region,
          pass2AllowedDomains,
        );
        merged = mergeLeadershipOntoStructure(structureRaw, pass2.raw);
        pass2Status = "completed";
        pass2Meta = {
          model: PASS_2_MODEL,
          maxSearches: pass2Searches,
          searchesUsed: pass2.searchesUsed,
          elapsedMs: pass2.elapsedMs,
          ...(MAP_DOMAIN_FILTER ? { allowedDomains: true } : {}),
        };
        req.log.info(
          { company: companyName, enriched: enrichTargets.length, pass2Searches },
          "Account map pass 2 leadership merge complete",
        );
      } catch (pass2Err) {
        pass2Status = "failed";
        req.log.warn(
          { err: pass2Err, company: companyName },
          "Pass 2 leadership enrichment failed — returning structure-only map",
        );
      }
    } else if (enrichTargets.length > 0) {
      pass2Status = "skipped_insufficient_time";
      req.log.warn(
        { company: companyName, remainingMs },
        "Skipping pass 2 — insufficient time remaining after structure pass",
      );
    }

    const toNormalize = { ...merged };
    const demotedOutOfScope = applyRegionScopeToRaw(toNormalize, region as MapRequestRegion);
    if (demotedOutOfScope > 0) {
      req.log.info(
        { company: companyName, region, demotedOutOfScope },
        "Demoted out-of-scope entities to unmappedEntities",
      );
    }
    const normalized = normalizeAccountMap(toNormalize, generatedAt, composed.sectorPackUsed);
    const entityCount = Array.isArray(normalized.entities) ? normalized.entities.length : 0;
    const sourcedLeaderCount = countSourcedLeaders(normalized.entities);
    const totalElapsedMs = Date.now() - requestStartedAt;
    const meta: AccountMapResponseMeta = {
      region,
      totalElapsedMs,
      entityCount,
      sourcedLeaderCount,
      pass2Status,
      pass1: pass1Meta,
      ...(pass2Meta ? { pass2: pass2Meta } : {}),
      domainFilterEnabled: MAP_DOMAIN_FILTER,
    };
    req.log.info(
      {
        company: companyName,
        elapsedMs: totalElapsedMs,
        entityCount,
        sourcedLeaderCount,
        pass2Status,
        meta,
      },
      "Account map complete",
    );
    res.json({ ...normalized, meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err, company: companyName }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
