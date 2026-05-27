import type { YourCompany } from "./your-company";

/** Keep in sync with artifacts/api-server/src/prompts/pack-loader.ts */
export const PACK_LOADING_LABELS: Record<string, string> = {
  "uk-dental": "Searching CQC, Companies House, Google reviews, and dental trade press — about 60 seconds...",
  "au-dental": "Searching AHPRA, ASIC, Seek, Google reviews, and dental trade press — about 60 seconds...",
  "uk-financial-services": "Searching Companies House, FCA, UK jobs, and financial trade press — about 60 seconds...",
};

const PACK_RULES: Array<{
  id: string;
  geographies: string[];
  keywords: string[];
}> = [
  {
    id: "uk-dental",
    geographies: ["uk", "united kingdom", "england", "scotland", "wales"],
    keywords: ["dental", "dental practice", "dental software", "practice management software", "pms", "chairside"],
  },
  {
    id: "au-dental",
    geographies: ["au", "australia"],
    keywords: ["dental", "dental practice", "dental software", "practice management software", "pms", "chairside"],
  },
  {
    id: "uk-financial-services",
    geographies: ["uk", "united kingdom", "great britain", "britain", "gb", "england", "scotland", "wales", "northern ireland"],
    keywords: [
      "insurance", "insurer", "reinsurance", "financial services", "financial service", "banking", "bank",
      "fintech", "underwriting", "wealth management", "asset management", "lender", "mortgage", "broking", "finance",
    ],
  },
];

function normaliseMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[\s_-]+/g, " ")
    .trim();
}

function normaliseGeo(value: string): string {
  return normaliseMatchText(value);
}

const UK_GEO_ALIASES = ["uk", "united kingdom", "great britain", "britain", "gb", "england", "scotland", "wales", "northern ireland"];
const AU_GEO_ALIASES = ["au", "australia", "australian", "nz", "new zealand"];

function expandGeoAliases(geographies: string[]): string[] {
  const expanded = new Set<string>();

  for (const geo of geographies.map(normaliseGeo).filter(Boolean)) {
    expanded.add(geo);
    if (UK_GEO_ALIASES.some(alias => geo === alias || geo.includes(alias) || alias.includes(geo))) {
      UK_GEO_ALIASES.forEach(alias => expanded.add(alias));
    }
    if (AU_GEO_ALIASES.some(alias => geo === alias || geo.includes(alias) || alias.includes(geo))) {
      AU_GEO_ALIASES.forEach(alias => expanded.add(alias));
    }
  }

  return [...expanded];
}

export function profileTextForPackMatch(yc: YourCompany): string {
  return normaliseMatchText([
    yc.companyName,
    yc.industryServed,
    yc.whoYouSellTo,
    yc.oneLineDescription,
    yc.whatYouSell,
    yc.customerOutcomes,
    yc.whyNowPattern,
    ...yc.buyerTitles,
    ...yc.painPointsSolved,
    yc.painPoints,
  ]
    .filter(Boolean)
    .join(" "));
}

function geoMatches(packGeographies: string[], userGeographies: string[]): boolean {
  const packGeos = expandGeoAliases(packGeographies);
  const userGeos = expandGeoAliases(userGeographies);

  return userGeos.some(userGeo =>
    packGeos.some(packGeo =>
      userGeo === packGeo
      || userGeo.includes(packGeo)
      || packGeo.includes(userGeo),
    ),
  );
}

export function detectSectorPackClient(yc: YourCompany): {
  packId: string | null;
  matchScore: number;
  matchedKeywords: string[];
} {
  if (yc.sectorPackOverride?.trim()) {
    return { packId: yc.sectorPackOverride.trim(), matchScore: 0, matchedKeywords: [] };
  }

  if (!yc.geographies.length) {
    return { packId: null, matchScore: 0, matchedKeywords: [] };
  }

  const text = profileTextForPackMatch(yc);
  let best: { id: string; score: number; matched: string[] } | null = null;

  for (const rule of PACK_RULES) {
    if (!geoMatches(rule.geographies, yc.geographies)) continue;

    const matched = rule.keywords.filter(keyword => text.includes(normaliseMatchText(keyword)));
    const score = matched.length;
    if (score <= 0) continue;
    if (!best || score > best.score) best = { id: rule.id, score, matched };
  }

  return {
    packId: best?.id ?? null,
    matchScore: best?.score ?? 0,
    matchedKeywords: best?.matched ?? [],
  };
}

export function matchSectorPackId(yc: YourCompany): string | null {
  if (yc.sectorPackOverride?.trim()) return yc.sectorPackOverride.trim();
  return detectSectorPackClient(yc).packId;
}

function defaultLoadingMessage(yc: YourCompany): string {
  const geos = yc.geographies.map(g => g.trim().toUpperCase());
  const isUk = geos.some(g => g === "UK" || g.includes("UNITED KINGDOM"));
  const isAu = geos.some(g => g === "AU" || g.includes("AUSTRALIA"));

  if (isUk) {
    return "Searching Companies House, UK jobs, LinkedIn, and trade press — 30–60 seconds...";
  }
  if (isAu) {
    return "Searching ASIC, Seek, LinkedIn, and AU press — 30–60 seconds...";
  }

  return "Searching public sources, LinkedIn, and trade press — 30–60 seconds...";
}

export function researchLoadingMessage(yc: YourCompany): string {
  const packId = matchSectorPackId(yc);
  if (packId && PACK_LOADING_LABELS[packId]) {
    return PACK_LOADING_LABELS[packId];
  }
  return defaultLoadingMessage(yc);
}
