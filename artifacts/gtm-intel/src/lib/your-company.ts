import { useEffect, useState } from "react";
import type { DealSize, YourCompany as YourCompanyShape } from "@workspace/api-client-react";

export type YourCompany = YourCompanyShape;
export type { DealSize };

const STORAGE_KEY = "gtm_your_company_v2";
const CHANGE_EVENT = "gtm:your-company-changed";

const EMPTY: YourCompany = {
  companyName: "",
  oneLineDescription: "",
  industryServed: "",
  geographies: [],
  dealSize: "mid-market",
  buyerTitles: [],
  painPointsSolved: [],
  customerOutcomes: "",
};

/** Normalise free-text or saved data into the v2 shape (ignores v1 localStorage). */
function normaliseYourCompany(raw: Partial<YourCompany> | null | undefined): YourCompany {
  if (!raw) return { ...EMPTY };

  return {
    companyName: raw.companyName?.trim() ?? "",
    oneLineDescription: raw.oneLineDescription?.trim() ?? raw.whatYouSell?.trim() ?? "",
    industryServed: raw.industryServed?.trim() ?? raw.whoYouSellTo?.trim() ?? "",
    geographies: Array.isArray(raw.geographies)
      ? raw.geographies.map(g => g.trim()).filter(Boolean)
      : [],
    dealSize: raw.dealSize ?? "mid-market",
    buyerTitles: Array.isArray(raw.buyerTitles)
      ? raw.buyerTitles.map(t => t.trim()).filter(Boolean)
      : raw.painPoints?.trim()
        ? []
        : [],
    painPointsSolved: Array.isArray(raw.painPointsSolved)
      ? raw.painPointsSolved.map(p => p.trim()).filter(Boolean)
      : raw.painPoints?.trim()
        ? raw.painPoints.split("\n").map(p => p.trim()).filter(Boolean)
        : [],
    customerOutcomes: raw.customerOutcomes?.trim() ?? "",
    whatYouSell: raw.whatYouSell?.trim(),
    whoYouSellTo: raw.whoYouSellTo?.trim(),
    painPoints: raw.painPoints?.trim(),
  };
}

/** Attach legacy prompt fields so older backend helpers keep working. */
function withLegacyFields(data: YourCompany): YourCompany {
  const geographies = data.geographies.map(g => g.trim()).filter(Boolean);
  const painPointsSolved = data.painPointsSolved.map(p => p.trim()).filter(Boolean);

  return {
    ...data,
    companyName: data.companyName.trim(),
    oneLineDescription: data.oneLineDescription.trim(),
    industryServed: data.industryServed.trim(),
    geographies,
    buyerTitles: data.buyerTitles.map(t => t.trim()).filter(Boolean),
    painPointsSolved,
    customerOutcomes: data.customerOutcomes?.trim() || undefined,
    whatYouSell: data.oneLineDescription.trim(),
    whoYouSellTo: [data.industryServed.trim(), ...geographies].filter(Boolean).join(" · "),
    painPoints: painPointsSolved.join("\n"),
  };
}

export function loadYourCompany(): YourCompany {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normaliseYourCompany(JSON.parse(raw)) : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function saveYourCompany(data: YourCompany) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withLegacyFields(data)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* localStorage full or unavailable */
  }
}

export function isYourCompanyConfigured(yc: YourCompany): boolean {
  return Boolean(
    yc.companyName.trim()
    && yc.oneLineDescription.trim()
    && yc.industryServed.trim()
    && yc.geographies.length > 0
    && yc.dealSize
    && yc.buyerTitles.length > 0
    && yc.painPointsSolved.length > 0,
  );
}

/** Payload for API requests — undefined when setup is incomplete. */
export function yourCompanyForRequest(yc?: YourCompany): YourCompany | undefined {
  const data = yc ?? loadYourCompany();
  if (!isYourCompanyConfigured(data)) return undefined;
  return withLegacyFields(data);
}

export function yourCompanyHasRadarContext(yc: YourCompany): boolean {
  return isYourCompanyConfigured(yc);
}

export function useYourCompany(): YourCompany {
  const [data, setData] = useState<YourCompany>(() => loadYourCompany());
  useEffect(() => {
    const onChange = () => setData(loadYourCompany());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);
  return data;
}

export function useIsYourCompanyConfigured(): boolean {
  const data = useYourCompany();
  return isYourCompanyConfigured(data);
}

export function linesToList(text: string): string[] {
  return text.split("\n").map(line => line.trim()).filter(Boolean);
}

export function listToLines(items: string[]): string {
  return items.join("\n");
}

export function parseGeographies(text: string): string[] {
  return text.split(/[,\n]/).map(part => part.trim()).filter(Boolean);
}

export function formatGeographies(items: string[]): string {
  return items.join(", ");
}

export const DEAL_SIZE_OPTIONS: { value: DealSize; label: string; hint: string }[] = [
  { value: "smb", label: "SMB", hint: "Small business — owner-operators, short sales cycles" },
  { value: "mid-market", label: "Mid-market", hint: "Mid-sized teams — multiple stakeholders" },
  { value: "enterprise", label: "Enterprise", hint: "Large organisations — complex buying committees" },
];
