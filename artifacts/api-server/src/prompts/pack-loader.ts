import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { YourCompanyInput } from "../lib/brief-ai";

export type SectorPackMeta = {
  id: string;
  name: string;
  version: number;
  lastReviewed?: string;
  geographies: string[];
  keywords: string[];
  expectedSeconds: number;
  loadingLabel: string;
};

export type SectorPack = SectorPackMeta & {
  body: string;
};

type ParsedFrontmatter = {
  name?: string;
  version?: number;
  last_reviewed?: string;
  expected_seconds?: number;
  loading_label?: string;
  applies_when?: {
    geographies?: string[];
    keywords?: string[];
  };
};

const DEFAULT_LOADING_LABELS: Record<string, string> = {
  "uk-dental": "Searching CQC, Companies House, Google reviews, and dental trade press — about 60 seconds...",
  "au-dental": "Searching AHPRA, ASIC, Seek, Google reviews, and dental trade press — about 60 seconds...",
};

function moduleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function resolveConstitutionPath(): string {
  const here = moduleDir();
  const candidates = [
    path.resolve(here, "../../../../GTM-INTEL.md"),
    path.resolve(here, "../../../GTM-INTEL.md"),
    path.resolve(here, "GTM-INTEL.md"),
    path.resolve(process.cwd(), "GTM-INTEL.md"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error("GTM-INTEL.md not found");
}

function resolvePacksDir(): string {
  const here = moduleDir();
  const candidates = [
    path.join(here, "packs"),
    path.join(here, "prompts/packs"),
    path.join(here, "../prompts/packs"),
    path.join(here, "src/prompts/packs"),
    path.resolve(process.cwd(), "artifacts/api-server/src/prompts/packs"),
    path.resolve(process.cwd(), "dist/prompts/packs"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error("Sector pack directory not found");
}

function parseInlineArray(value: string): string[] {
  return value
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);
}

function parseFrontmatter(raw: string): { meta: ParsedFrontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const yaml = match[1];
  const body = match[2];
  const meta: ParsedFrontmatter = { applies_when: { geographies: [], keywords: [] } };
  let section: "root" | "applies_when" | "keywords" = "root";

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isRootKey = !/^[\s-]/.test(line) && trimmed.includes(":");

    if (trimmed === "applies_when:") {
      section = "applies_when";
      continue;
    }

    if (section === "keywords" && trimmed.startsWith("- ")) {
      meta.applies_when!.keywords!.push(trimmed.slice(2).trim());
      continue;
    }

    if (section === "applies_when" && trimmed.startsWith("keywords:")) {
      section = "keywords";
      continue;
    }

    if (isRootKey) {
      section = "root";
    }

    if (section !== "root") {
      if (trimmed.startsWith("geographies:")) {
        const inline = trimmed.match(/geographies:\s*\[(.*)\]/);
        if (inline) {
          meta.applies_when!.geographies = parseInlineArray(inline[1]);
        }
      }
      continue;
    }

    if (trimmed.startsWith("geographies:")) {
      const inline = trimmed.match(/geographies:\s*\[(.*)\]/);
      if (inline) {
        meta.applies_when!.geographies = parseInlineArray(inline[1]);
      }
      continue;
    }

    const scalar = trimmed.match(/^([a-z_]+):\s*(.+)$/);
    if (!scalar) continue;

    const [, key, rawValue] = scalar;
    const value = rawValue.replace(/^["']|["']$/g, "").trim();

    switch (key) {
      case "name":
        meta.name = value;
        break;
      case "version":
        meta.version = Number(value);
        break;
      case "last_reviewed":
        meta.last_reviewed = value;
        break;
      case "expected_seconds":
        meta.expected_seconds = Number(value);
        break;
      case "loading_label":
        meta.loading_label = value;
        break;
      default:
        break;
    }
  }

  return { meta, body };
}

function parsePackFile(id: string, raw: string): SectorPack {
  const { meta, body } = parseFrontmatter(raw);
  const expectedSeconds = meta.expected_seconds ?? 60;

  return {
    id,
    name: meta.name ?? id,
    version: meta.version ?? 1,
    lastReviewed: meta.last_reviewed,
    geographies: meta.applies_when?.geographies ?? [],
    keywords: meta.applies_when?.keywords ?? [],
    expectedSeconds,
    loadingLabel: meta.loading_label ?? DEFAULT_LOADING_LABELS[id] ?? `Researching with ${meta.name ?? id} sources — about ${expectedSeconds} seconds...`,
    body: body.trim(),
  };
}

let cachedConstitution: string | null = null;
let cachedPacks: SectorPack[] | null = null;

export function loadConstitution(): string {
  if (cachedConstitution) return cachedConstitution;
  cachedConstitution = readFileSync(resolveConstitutionPath(), "utf8").trim();
  return cachedConstitution;
}

export function loadSectorPacks(): SectorPack[] {
  if (cachedPacks) return cachedPacks;

  const packsDir = resolvePacksDir();
  cachedPacks = readdirSync(packsDir)
    .filter(file => file.endsWith(".md"))
    .map(file => parsePackFile(file.replace(/\.md$/, ""), readFileSync(path.join(packsDir, file), "utf8")));

  return cachedPacks;
}

function normaliseGeo(value: string): string {
  return value.trim().toLowerCase();
}

function profileText(yourCompany: YourCompanyInput): string {
  return [
    yourCompany.industryServed,
    yourCompany.whoYouSellTo,
    yourCompany.oneLineDescription,
    yourCompany.whatYouSell,
    ...(yourCompany.buyerTitles ?? []),
    ...(yourCompany.painPointsSolved ?? []),
    yourCompany.painPoints,
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

function keywordScore(packKeywords: string[], text: string): number {
  return packKeywords.reduce((score, keyword) => (
    text.includes(keyword.toLowerCase()) ? score + 1 : score
  ), 0);
}

export function selectSectorPack(yourCompany?: YourCompanyInput): SectorPack | null {
  if (!yourCompany?.geographies?.length) return null;

  const text = profileText(yourCompany);
  let best: { pack: SectorPack; score: number } | null = null;

  for (const pack of loadSectorPacks()) {
    if (!geoMatches(pack.geographies, yourCompany.geographies)) continue;

    const score = keywordScore(pack.keywords, text);
    if (score <= 0) continue;

    if (!best || score > best.score) {
      best = { pack, score };
    }
  }

  return best?.pack ?? null;
}

export function countSourcesInPack(body: string): number {
  const matches = body.match(/^###\s+\d+\./gm);
  return matches?.length ?? 7;
}

export function toResearchPackMeta(pack: SectorPack): SectorPackMeta {
  const { body: _, ...meta } = pack;
  return meta;
}

/** Exported for frontend parity — keep in sync with selectSectorPack rules. */
export function matchSectorPackId(yourCompany: {
  geographies?: string[];
  industryServed?: string;
  whoYouSellTo?: string;
  oneLineDescription?: string;
  whatYouSell?: string;
  buyerTitles?: string[];
  painPointsSolved?: string[];
  painPoints?: string;
}): string | null {
  return selectSectorPack(yourCompany)?.id ?? null;
}

export function getLoadingLabelForPackId(packId: string | null): string | null {
  if (!packId) return null;
  const pack = loadSectorPacks().find(item => item.id === packId);
  return pack?.loadingLabel ?? DEFAULT_LOADING_LABELS[packId] ?? null;
}
