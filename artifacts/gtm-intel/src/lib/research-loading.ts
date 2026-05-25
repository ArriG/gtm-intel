import type { YourCompany } from "./your-company";

const PACK_LOADING_LABELS: Record<string, string> = {
  "uk-dental": "Searching CQC, Companies House, Google reviews, and dental trade press — about 60 seconds...",
  "au-dental": "Searching AHPRA, ASIC, Seek, Google reviews, and dental trade press — about 60 seconds...",
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
];

function normaliseGeo(value: string): string {
  return value.trim().toLowerCase();
}

function profileText(yc: YourCompany): string {
  return [
    yc.industryServed,
    yc.oneLineDescription,
    yc.whatYouSell,
    ...yc.buyerTitles,
    ...yc.painPointsSolved,
    yc.painPoints,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function geoMatches(packGeographies: string[], userGeographies: string[]): boolean {
  const packGeos = packGeographies.map(normaliseGeo);
  const userGeos = userGeographies.map(normaliseGeo);

  return userGeos.some(userGeo =>
    packGeos.some(packGeo =>
      userGeo === packGeo
      || userGeo.includes(packGeo)
      || packGeo.includes(userGeo),
    ),
  );
}

/** Keep in sync with artifacts/api-server/src/prompts/pack-loader.ts */
export function matchSectorPackId(yc: YourCompany): string | null {
  if (!yc.geographies.length) return null;

  const text = profileText(yc);
  let best: { id: string; score: number } | null = null;

  for (const rule of PACK_RULES) {
    if (!geoMatches(rule.geographies, yc.geographies)) continue;

    const score = rule.keywords.reduce((total, keyword) => (
      text.includes(keyword) ? total + 1 : total
    ), 0);

    if (score <= 0) continue;
    if (!best || score > best.score) best = { id: rule.id, score };
  }

  return best?.id ?? null;
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
