import { useEffect, useState } from "react";

export interface YourCompany {
  companyName: string;
  whatYouSell: string;
  whoYouSellTo: string;
  painPoints: string;
  customerOutcomes: string;
}

const STORAGE_KEY = "gtm_your_company_v1";
const CHANGE_EVENT = "gtm:your-company-changed";

const EMPTY: YourCompany = {
  companyName: "",
  whatYouSell: "",
  whoYouSellTo: "",
  painPoints: "",
  customerOutcomes: "",
};

export function loadYourCompany(): YourCompany {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveYourCompany(data: YourCompany) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* localStorage full or unavailable */
  }
}

/** Minimum Your Company info needed to anchor a radar scan on industry/target market. */
export function yourCompanyHasRadarContext(yc: YourCompany): boolean {
  return Boolean(yc.whoYouSellTo.trim() || yc.whatYouSell.trim());
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
