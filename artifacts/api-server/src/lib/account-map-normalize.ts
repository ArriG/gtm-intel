import { randomUUID } from "node:crypto";
import { stripCitationTags } from "./brief-ai";

const REGIONS = [
  "europe",
  "north_america",
  "asia_pacific",
  "latin_america",
  "middle_east_africa",
  "group_unallocated",
] as const;

const PARENT_RELATIONSHIPS = new Set([
  "subsidiary",
  "branch",
  "affiliate",
  "division",
  "joint_venture",
]);

const BUYING_AUTONOMY = new Set(["independent", "group_gated", "mixed", "unknown"]);
const FIT_TIERS = new Set(["strong", "moderate", "skip"]);
const FIT_RANK: Record<string, number> = { strong: 0, moderate: 1, skip: 2 };
const SOURCE_CONFIDENCE = new Set(["verified", "informed", "assumed"]);
const MAX_PER_REGION = 8;
const MAX_TOTAL = 20;
const MAX_BUYERS = 3;

type RawBuyer = {
  name?: string;
  role?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  tenureNote?: string;
};

type RawEntity = {
  id?: string;
  name?: string;
  country?: string;
  region?: string;
  businessLine?: string;
  parentRelationship?: string;
  context?: string;
  buyingAutonomy?: string;
  fitTier?: string;
  fitReason?: string;
  buyers?: unknown;
  leadershipNote?: string;
  sources?: unknown;
};

type RawBriefSource = {
  type?: string;
  label?: string;
  detail?: string;
  url?: string;
  confidence?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? stripCitationTags(value).trim() : "";
}

function normaliseRegion(value: unknown): typeof REGIONS[number] {
  const region = cleanString(value);
  return (REGIONS as readonly string[]).includes(region)
    ? region as typeof REGIONS[number]
    : "group_unallocated";
}

function normaliseBriefSources(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];

  const sources: Array<Record<string, unknown>> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const source = item as RawBriefSource;
    const label = cleanString(source.label);
    const detail = cleanString(source.detail);
    if (!label || !detail) continue;

    const confidence = cleanString(source.confidence);
    sources.push({
      type: cleanString(source.type) || "web",
      label,
      detail,
      url: cleanString(source.url) || undefined,
      confidence: SOURCE_CONFIDENCE.has(confidence) ? confidence : "informed",
    });
  }

  return sources;
}

function normaliseOutreachSources(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];

  const items: Array<Record<string, unknown>> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const source = entry as { label?: string; detail?: string; url?: string; relatedEntity?: string };
    const label = cleanString(source.label);
    const detail = cleanString(source.detail);
    if (!label || !detail) continue;

    items.push({
      label,
      detail,
      ...(cleanString(source.url) ? { url: cleanString(source.url) } : {}),
      ...(cleanString(source.relatedEntity) ? { relatedEntity: cleanString(source.relatedEntity) } : {}),
    });
    if (items.length >= 8) break;
  }

  return items;
}

function normaliseCompanySnapshot(raw: unknown, parent: Record<string, unknown>) {
  const existing = asRecord(raw);
  const pains = Array.isArray(existing?.possiblePainPoints)
    ? existing!.possiblePainPoints!.map(item => cleanString(item)).filter(Boolean)
    : [];

  return {
    size: cleanString(existing?.size) || "Unknown",
    industry: cleanString(existing?.industry) || String(parent.industry ?? "Unknown"),
    location: cleanString(existing?.location) || String(parent.headquartersCountry ?? "Unknown"),
    fundingStage: cleanString(existing?.fundingStage) || "Unknown",
    ...(cleanString(existing?.techStack) ? { techStack: cleanString(existing?.techStack) } : {}),
    possiblePainPoints: pains,
    sources: normaliseBriefSources(existing?.sources),
  };
}

function normaliseBuyers(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];

  const buyers: Array<Record<string, unknown>> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const buyer = item as RawBuyer;
    const name = cleanString(buyer.name);
    const role = cleanString(buyer.role);
    const sourceUrl = cleanString(buyer.sourceUrl);
    const sourceTitle = cleanString(buyer.sourceTitle);
    if (!name || !role || !sourceUrl || !sourceTitle) continue;
    if (!/^https?:\/\//i.test(sourceUrl)) continue;
    if (/not publicly|not available|not identified|unknown|unidentified|n\/a|none listed|no name/i.test(name)) continue;

    buyers.push({
      name,
      role,
      sourceUrl,
      sourceTitle,
      ...(cleanString(buyer.tenureNote) ? { tenureNote: cleanString(buyer.tenureNote) } : {}),
    });
    if (buyers.length >= MAX_BUYERS) break;
  }

  return buyers;
}

function normaliseEntity(raw: RawEntity): Record<string, unknown> | null {
  const name = cleanString(raw.name);
  const country = cleanString(raw.country);
  const businessLine = cleanString(raw.businessLine);
  const context = cleanString(raw.context);
  const fitReason = cleanString(raw.fitReason);
  if (!name || !country || !businessLine || !context || !fitReason) return null;

  const parentRelationship = cleanString(raw.parentRelationship);
  const buyingAutonomy = cleanString(raw.buyingAutonomy);
  const fitTier = cleanString(raw.fitTier);

  const sources = Array.isArray(raw.sources)
    ? raw.sources
      .map(item => cleanString(item))
      .filter(url => /^https?:\/\//i.test(url))
    : [];

  const buyers = normaliseBuyers(raw.buyers);
  const leadershipNote = cleanString(raw.leadershipNote);

  return {
    id: cleanString(raw.id) || randomUUID(),
    name,
    country,
    region: normaliseRegion(raw.region),
    businessLine,
    parentRelationship: PARENT_RELATIONSHIPS.has(parentRelationship) ? parentRelationship : "subsidiary",
    context,
    buyingAutonomy: BUYING_AUTONOMY.has(buyingAutonomy) ? buyingAutonomy : "unknown",
    fitTier: FIT_TIERS.has(fitTier) ? fitTier : "moderate",
    fitReason,
    buyers,
    ...(leadershipNote ? { leadershipNote } : {}),
    sources,
  };
}

function sortEntities(entities: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return [...entities].sort((a, b) => {
    const tierA = FIT_RANK[String(a.fitTier)] ?? 1;
    const tierB = FIT_RANK[String(b.fitTier)] ?? 1;
    if (tierA !== tierB) return tierA - tierB;
    return String(a.name).localeCompare(String(b.name));
  });
}

export function normalizeAccountMap(
  raw: Record<string, unknown>,
  generatedAt: string,
  sectorPackUsed: string,
): Record<string, unknown> {
  const parentRaw = asRecord(raw.parent) ?? {};
  const parent = {
    name: cleanString(parentRaw.name) || "Unknown group",
    description: cleanString(parentRaw.description) || "No group description available from public sources.",
    headquartersCountry: cleanString(parentRaw.headquartersCountry) || "Unknown",
    industry: cleanString(parentRaw.industry) || "Unknown",
  };

  const rawEntities = Array.isArray(raw.entities) ? raw.entities : [];
  const parsed: Array<Record<string, unknown>> = [];
  const omittedNames: string[] = [];

  for (const item of rawEntities) {
    if (!item || typeof item !== "object") continue;
    const entity = normaliseEntity(item as RawEntity);
    if (entity) parsed.push(entity);
  }

  const sorted = sortEntities(parsed);
  const byRegion = new Map<string, Array<Record<string, unknown>>>();
  for (const entity of sorted) {
    const region = String(entity.region);
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region)!.push(entity);
  }

  const capped: Array<Record<string, unknown>> = [];
  for (const [, regionEntities] of byRegion) {
    const kept = regionEntities.slice(0, MAX_PER_REGION);
    const dropped = regionEntities.slice(MAX_PER_REGION);
    capped.push(...kept);
    for (const entity of dropped) {
      omittedNames.push(String(entity.name));
    }
  }

  let entities = sortEntities(capped);
  if (entities.length > MAX_TOTAL) {
    const extra = entities.slice(MAX_TOTAL);
    entities = entities.slice(0, MAX_TOTAL);
    for (const entity of extra) {
      omittedNames.push(String(entity.name));
    }
  }

  const modelUnmapped = Array.isArray(raw.unmappedEntities)
    ? raw.unmappedEntities.map(item => cleanString(item)).filter(Boolean)
    : [];

  const unmappedEntities = [...new Set([...modelUnmapped, ...omittedNames])];

  const limitations = cleanString(raw.limitations)
    || [
      "European entities use regulator and filing sources in depth. Non-European regions rely on web search and public sources — verify before outreach.",
      "Subsidiary-level Chief Actuary, CRO, and COO names often sit only in deeper filings (UK FCA SMCR register, EU SFCR PDFs, BaFin Vorstand, FINMA registers). When web search only surfaces the CEO, this mapping shows the CEO and notes the gap per entity — drill into the SFCR or regulator register directly for the wider executive committee before outreach.",
    ].join(" ");

  return {
    parent,
    entities,
    unmappedEntities,
    limitations,
    isSingleEntity: raw.isSingleEntity === true,
    companySnapshot: normaliseCompanySnapshot(raw.companySnapshot, parent),
    outreachSources: normaliseOutreachSources(raw.outreachSources),
    generatedAt,
    sectorPackUsed,
  };
}
