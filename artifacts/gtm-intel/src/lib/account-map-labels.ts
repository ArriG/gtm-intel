import type { MapRegion } from "@workspace/api-client-react";

export const REGION_LABELS: Record<MapRegion, string> = {
  europe: "Europe",
  north_america: "North America",
  asia_pacific: "Asia Pacific",
  latin_america: "Latin America",
  middle_east_africa: "Middle East & Africa",
  group_unallocated: "Group Functions",
};

export const REGION_ORDER: MapRegion[] = [
  "europe",
  "north_america",
  "asia_pacific",
  "latin_america",
  "middle_east_africa",
  "group_unallocated",
];

export const FIT_TIER_LABELS = {
  strong: "Strong fit",
  moderate: "Moderate fit",
  skip: "Skip",
} as const;

export const FIT_TIER_CLASS = {
  strong: "bg-emerald-100 text-emerald-800 border-emerald-200",
  moderate: "bg-amber-100 text-amber-900 border-amber-200",
  skip: "bg-muted text-muted-foreground border-border",
} as const;

export const AUTONOMY_LABELS = {
  independent: "Buys independently",
  group_gated: "Gated by group procurement",
  mixed: "Mixed buying autonomy",
  unknown: "Buying autonomy not publicly clear",
} as const;

export const RELATIONSHIP_LABELS = {
  subsidiary: "Subsidiary",
  branch: "Branch",
  affiliate: "Affiliate",
  division: "Division",
  joint_venture: "Joint venture",
} as const;

export function groupEntitiesByRegion<T extends { region: MapRegion }>(entities: T[]): Map<MapRegion, T[]> {
  const grouped = new Map<MapRegion, T[]>();
  for (const region of REGION_ORDER) grouped.set(region, []);
  for (const entity of entities) {
    const bucket = grouped.get(entity.region) ?? [];
    bucket.push(entity);
    grouped.set(entity.region, bucket);
  }
  return grouped;
}

/**
 * Clay-style solid card colours. Cards are coloured by BUSINESS LINE, so the same
 * line shares a colour across every region (e.g. all Property & Casualty are magenta).
 * Listed as literal strings so Tailwind's scanner generates them.
 */
export const BUSINESS_LINE_COLOR_CLASSES = [
  "bg-[#B11A53]", // magenta
  "bg-[#1D4FD7]", // royal blue
  "bg-[#1B7A45]", // forest green
  "bg-[#C2410C]", // burnt orange
  "bg-[#6D28D9]", // violet
  "bg-[#0F766E]", // teal
  "bg-[#BE123C]", // crimson
  "bg-[#3730A3]", // indigo
  "bg-[#4D7C0F]", // olive
  "bg-[#9D174D]", // rose
  "bg-[#334155]", // slate
  "bg-[#B45309]", // amber
] as const;

/** Synonym rules collapse free-text business lines to a stable key. Order matters. */
const BUSINESS_LINE_SYNONYMS: Array<[RegExp, string]> = [
  [/(p\s*&\s*c|property\s*&?\s*and?\s*casualty)/, "property_casualty"],
  [/(reinsur)/, "reinsurance"],
  [/(life|pension|annuit)/, "life"],
  [/(health|medical)/, "health"],
  [/(asset\s*management|investment|wealth)/, "asset_management"],
  [/(specialty|special\s*lines|marine|aviation)/, "specialty"],
  [/(general\s*insurance|general)/, "general"],
  [/(commercial|corporate|personal)/, "commercial"],
];

/** Fixed palette slots for well-known business lines. */
const KNOWN_LINE_COLOR_INDEX: Record<string, number> = {
  property_casualty: 0,
  life: 1,
  general: 2,
  health: 3,
  commercial: 4,
  reinsurance: 5,
  specialty: 6,
  asset_management: 7,
};

export function normaliseBusinessLine(label?: string | null): string {
  const raw = (label ?? "").toLowerCase().trim();
  if (!raw) return "";
  for (const [pattern, key] of BUSINESS_LINE_SYNONYMS) {
    if (pattern.test(raw)) return key;
  }
  return raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Same business line -> same colour in every region; unknown lines hash deterministically. */
export function businessLineColorClass(label?: string | null): string {
  const key = normaliseBusinessLine(label);
  if (!key) return BUSINESS_LINE_COLOR_CLASSES[10]; // slate fallback
  const known = KNOWN_LINE_COLOR_INDEX[key];
  if (known !== undefined) return BUSINESS_LINE_COLOR_CLASSES[known];
  return BUSINESS_LINE_COLOR_CLASSES[hashString(key) % BUSINESS_LINE_COLOR_CLASSES.length];
}

const PLACEHOLDER_NAME = /not publicly|not available|not identified|unknown|unidentified|n\/a|none listed|no name/i;

/** Drop model placeholders — only show verifiable named executives. */
export function isVerifiedLeaderName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return false;
  return !PLACEHOLDER_NAME.test(trimmed);
}

export function verifiedLeaders<T extends { name: string }>(leaders: T[]): T[] {
  return leaders.filter(leader => isVerifiedLeaderName(leader.name));
}
