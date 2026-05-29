import type { AccountMapResponse } from "@workspace/api-client-react";
import type { MapRegion } from "@/lib/map-region";

const STORAGE_KEY = "gtm_map_session_v1";

export type MapSession = {
  label: string;
  url: string;
  region?: MapRegion;
  accountMap: AccountMapResponse;
};

export function saveMapSession(session: MapSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* sessionStorage unavailable */
  }
}

export function loadMapSession(): MapSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MapSession;
  } catch {
    return null;
  }
}

export function clearMapSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
