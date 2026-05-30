/** Request region (UI picker) — matches AccountMapRequest.region */
export type MapRequestRegion = "emea" | "apac" | "north_america" | "latam";

const ENTITY_REGIONS = [
  "europe",
  "north_america",
  "asia_pacific",
  "latin_america",
  "middle_east_africa",
  "group_unallocated",
] as const;

export type EntityRegion = (typeof ENTITY_REGIONS)[number];

/** Entity `region` buckets that count as in-scope for each map request region. */
export const ENTITY_REGIONS_IN_SCOPE: Record<MapRequestRegion, readonly EntityRegion[]> = {
  emea: ["europe", "middle_east_africa"],
  apac: ["asia_pacific"],
  north_america: ["north_america"],
  latam: ["latin_america"],
};

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function entityRegionBucket(value: unknown): EntityRegion {
  const region = cleanName(value);
  return (ENTITY_REGIONS as readonly string[]).includes(region)
    ? (region as EntityRegion)
    : "group_unallocated";
}

/**
 * Enforce region scope before normalize: out-of-scope rows in entities[] become
 * name-only entries in unmappedEntities[] (saves tokens; Pass 2 stays in-scope).
 */
export function applyRegionScopeToRaw(
  raw: Record<string, unknown>,
  scopeRegion: MapRequestRegion,
): number {
  const allowed = new Set<string>(ENTITY_REGIONS_IN_SCOPE[scopeRegion]);
  const rawEntities = Array.isArray(raw.entities) ? raw.entities : [];
  const inScope: unknown[] = [];
  const demotedNames: string[] = [];

  for (const item of rawEntities) {
    if (!item || typeof item !== "object") continue;
    const record = item as { name?: unknown; region?: unknown };
    const name = cleanName(record.name);
    const bucket = entityRegionBucket(record.region);
    if (allowed.has(bucket)) {
      inScope.push(item);
    } else if (name) {
      demotedNames.push(name);
    }
  }

  const modelUnmapped = Array.isArray(raw.unmappedEntities)
    ? raw.unmappedEntities.map(item => cleanName(item)).filter(Boolean)
    : [];

  raw.entities = inScope;
  raw.unmappedEntities = [...new Set([...modelUnmapped, ...demotedNames])];
  return demotedNames.length;
}
