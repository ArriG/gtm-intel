import type Anthropic from "@anthropic-ai/sdk";
import { callClaudeJson, type YourCompanyInput } from "./brief-ai";

export type ResearchSourceType = "web" | "registry" | "jobs" | "linkedin" | "press" | "other";

export type ResearchSource = {
  id: string;
  name: string;
  searchHint: string;
  reasoning: string;
  sourceType: ResearchSourceType;
  enabled: boolean;
  priority: number;
};

export type ResearchSourcePlan = {
  introMessage?: string;
  sources: ResearchSource[];
  updatedAt?: string;
};

const SOURCE_TYPE_SET = new Set<ResearchSourceType>([
  "web", "registry", "jobs", "linkedin", "press", "other",
]);

const DEFAULT_AU_SOURCE_BLOCK = `When given a company URL, search across these 5 HIGH-PRIORITY sources only — do not spend time on other sources:

SOURCE 1 — Company website and blog: Read their homepage, about page, and any recent blog posts.

SOURCE 2 — Australian business registry: Search "site:abr.business.gov.au [company name]" for ABN details. Search "[company name] ASIC" for any regulatory filings or director information.

SOURCE 3 — Job postings: Search "[company name] jobs site:seek.com.au" — read job descriptions carefully. What roles are they hiring for? What does the job description reveal about their operational challenges? This is your highest-signal source for pain points.

SOURCE 4 — LinkedIn leadership signals: Search "site:linkedin.com [CEO name] [company name]" and "site:linkedin.com [CFO name] [company name]" for any recent public posts from their C-suite. Note exact quotes if found.

SOURCE 5 — Australian press: Search "[company name] site:afr.com OR site:smartcompany.com.au OR site:fintech.com.au" for recent coverage in the last 12 months.`;

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "source";
}

function normalizeSource(raw: Partial<ResearchSource>, index: number): ResearchSource | null {
  if (!raw.name?.trim() || !raw.searchHint?.trim() || !raw.reasoning?.trim()) return null;
  const sourceType = SOURCE_TYPE_SET.has(raw.sourceType as ResearchSourceType)
    ? raw.sourceType as ResearchSourceType
    : "other";

  return {
    id: raw.id?.trim() || slugify(raw.name),
    name: raw.name.trim(),
    searchHint: raw.searchHint.trim(),
    reasoning: raw.reasoning.trim(),
    sourceType,
    enabled: raw.enabled !== false,
    priority: typeof raw.priority === "number" && raw.priority > 0 ? raw.priority : index + 1,
  };
}

export function normalizeResearchSourcePlan(raw: Partial<ResearchSourcePlan>): ResearchSourcePlan | null {
  const sources = (raw.sources ?? [])
    .map((source, index) => normalizeSource(source, index))
    .filter((source): source is ResearchSource => source !== null)
    .sort((a, b) => a.priority - b.priority)
    .map((source, index) => ({ ...source, priority: index + 1 }));

  if (sources.length < 3) return null;
  return {
    introMessage: raw.introMessage?.trim() || undefined,
    sources,
    updatedAt: raw.updatedAt,
  };
}

export function buildResearchSourceInstructions(plan?: ResearchSourcePlan): string {
  const normalized = plan ? normalizeResearchSourcePlan(plan) : null;
  if (!normalized) return DEFAULT_AU_SOURCE_BLOCK;

  const enabled = normalized.sources.filter(source => source.enabled);
  if (enabled.length === 0) return DEFAULT_AU_SOURCE_BLOCK;

  const lines = enabled.map((source, index) => (
    `SOURCE ${index + 1} — ${source.name}: ${source.searchHint}\nWhy this source: ${source.reasoning}`
  ));

  return `When given a company URL, search across these HIGH-PRIORITY sources only — do not spend time on other sources:

${lines.join("\n\n")}`;
}

function buildPlanningSystemPrompt(): string {
  return `You are a senior GTM research strategist. Given a seller's company profile, design a practical web research source plan for account briefs.

Rules:
- Return 5 to 7 sources tailored to the seller's geographies, industry served, and deal motion.
- Do NOT use generic vertical templates — infer from the profile.
- Each source needs a concrete searchHint Claude can run during web_search (include site: operators where useful).
- Include at least: company website, one registry or official directory, one jobs/hiring source, LinkedIn leadership, and one trade/industry press source appropriate to the geography.
- UK profiles should prefer Companies House, UK job boards, and UK trade press — not ASIC or Seek.
- AU profiles may use ABN/ASIC, Seek, AFR/SmartCompany.
- Enterprise motions may emphasise leadership press and regulatory filings; SMB motions may emphasise local business press and owner-operator signals.
- introMessage should start with "Great [first name or there]" if no name is known use "Great" — one warm sentence explaining the plan in plain English.

Return ONLY valid JSON:
{
  "introMessage": "Great Ari, based on what you've told me about selling underwriting software into UK insurers, here's how I'll research your accounts...",
  "sources": [
    {
      "id": "companies-house",
      "name": "Companies House",
      "searchHint": "site:find-and-update.company-information.service.gov.uk [company name]",
      "reasoning": "UK registry — confirms entity status, directors, and filing activity for enterprise targets.",
      "sourceType": "registry",
      "enabled": true,
      "priority": 1
    }
  ]
}

sourceType must be one of: web, registry, jobs, linkedin, press, other.`;
}

function buildPlanningUserMessage(yourCompany: YourCompanyInput): string {
  const geographies = yourCompany.geographies?.join(", ") ?? "Unknown";
  const buyers = yourCompany.buyerTitles?.join(", ") ?? "Unknown";
  const pains = yourCompany.painPointsSolved?.join("; ") ?? yourCompany.painPoints ?? "Unknown";

  return `Design a research source plan for this seller profile:

Company name: ${yourCompany.companyName ?? "Unknown"}
What we sell: ${yourCompany.oneLineDescription ?? yourCompany.whatYouSell ?? "Unknown"}
Industry served: ${yourCompany.industryServed ?? yourCompany.whoYouSellTo ?? "Unknown"}
Geographies: ${geographies}
Deal motion: ${yourCompany.dealSize ?? "Unknown"}
Typical buyers: ${buyers}
Pain points solved: ${pains}

Respond with ONLY the JSON object.`;
}

export async function planResearchSources(
  client: Anthropic,
  yourCompany: YourCompanyInput,
): Promise<ResearchSourcePlan> {
  const result = await callClaudeJson(
    client,
    buildPlanningSystemPrompt(),
    buildPlanningUserMessage(yourCompany),
    2500,
    30000,
  ) as Partial<ResearchSourcePlan>;

  const normalized = normalizeResearchSourcePlan(result);
  if (!normalized) {
    throw new Error("Could not generate a valid source plan. Please try again.");
  }

  return {
    ...normalized,
    updatedAt: new Date().toISOString(),
  };
}

export { DEFAULT_AU_SOURCE_BLOCK };
