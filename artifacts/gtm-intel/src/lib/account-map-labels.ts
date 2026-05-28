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
