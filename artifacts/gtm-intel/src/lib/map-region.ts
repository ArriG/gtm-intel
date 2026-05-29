import type { AccountMapRequestRegion } from "@workspace/api-client-react";

export type MapRegion = AccountMapRequestRegion;

export const MAP_REGION_OPTIONS: Array<{ value: MapRegion; label: string }> = [
  { value: "uk_ireland", label: "UK & Ireland" },
  { value: "europe", label: "Continental Europe" },
  { value: "north_america", label: "North America" },
  { value: "apac", label: "Asia-Pacific" },
  { value: "global", label: "Global" },
];

const REGION_LABELS: Record<MapRegion, string> = Object.fromEntries(
  MAP_REGION_OPTIONS.map(o => [o.value, o.label]),
) as Record<MapRegion, string>;

export function regionLabel(region: MapRegion): string {
  return REGION_LABELS[region] ?? "Global";
}

const UK_IE = ["uk", "united kingdom", "great britain", "britain", "gb", "england", "scotland", "wales", "ireland", "irish", "eire"];
const EUROPE = ["eu", "eea", "europe", "european", "germany", "france", "netherlands", "italy", "spain", "switzerland", "swiss", "belgium", "austria", "nordic", "sweden", "denmark", "norway", "finland", "poland", "portugal"];
const NORTH_AMERICA = ["us", "usa", "united states", "america", "canada", "canadian", "north america"];
const APAC = ["apac", "asia", "asia-pacific", "australia", "australian", "nz", "new zealand", "singapore", "japan", "hong kong", "india", "china"];

/** Smart default region from Your Company geographies — manually overridable in the UI. */
export function defaultRegionFromGeographies(geographies?: string[]): MapRegion {
  const geos = (geographies ?? []).map(g => g.trim().toLowerCase()).filter(Boolean);
  if (geos.length === 0) return "global";

  const matches = (aliases: string[]) =>
    geos.some(geo => aliases.some(alias => geo === alias || geo.includes(alias) || alias.includes(geo)));

  if (matches(UK_IE)) return "uk_ireland";
  if (matches(EUROPE)) return "europe";
  if (matches(NORTH_AMERICA)) return "north_america";
  if (matches(APAC)) return "apac";
  return "global";
}
