import type { AccountMapRequestRegion } from "@workspace/api-client-react";

export type MapRegion = AccountMapRequestRegion;

export const MAP_REGION_OPTIONS: Array<{ value: MapRegion; label: string }> = [
  { value: "emea", label: "EMEA" },
  { value: "apac", label: "Asia-Pacific" },
  { value: "north_america", label: "North America" },
  { value: "latam", label: "Latin America" },
];

const DEFAULT_REGION: MapRegion = "emea";

const REGION_LABELS: Record<MapRegion, string> = Object.fromEntries(
  MAP_REGION_OPTIONS.map(o => [o.value, o.label]),
) as Record<MapRegion, string>;

export function regionLabel(region: MapRegion): string {
  return REGION_LABELS[region] ?? "EMEA";
}

const EMEA = ["uk", "united kingdom", "great britain", "britain", "gb", "england", "scotland", "wales", "ireland", "irish", "eire", "eu", "eea", "emea", "europe", "european", "germany", "france", "netherlands", "italy", "spain", "switzerland", "swiss", "belgium", "austria", "nordic", "sweden", "denmark", "norway", "finland", "poland", "portugal", "middle east", "uae", "dubai", "saudi", "africa", "south africa"];
const NORTH_AMERICA = ["us", "usa", "united states", "america", "canada", "canadian", "north america"];
const APAC = ["apac", "asia", "asia-pacific", "australia", "australian", "nz", "new zealand", "singapore", "japan", "hong kong", "india", "china"];
const LATAM = ["latam", "latin america", "south america", "brazil", "brasil", "mexico", "chile", "colombia", "peru", "argentina"];

/** Smart default region from Your Company geographies — manually overridable in the UI. */
export function defaultRegionFromGeographies(geographies?: string[]): MapRegion {
  const geos = (geographies ?? []).map(g => g.trim().toLowerCase()).filter(Boolean);
  if (geos.length === 0) return DEFAULT_REGION;

  const matches = (aliases: string[]) =>
    geos.some(geo => aliases.some(alias => geo === alias || geo.includes(alias) || alias.includes(geo)));

  if (matches(EMEA)) return "emea";
  if (matches(NORTH_AMERICA)) return "north_america";
  if (matches(APAC)) return "apac";
  if (matches(LATAM)) return "latam";
  return DEFAULT_REGION;
}
