import type { AccountBrief, LinkedInPost } from "@workspace/api-client-react";

const STORAGE_KEY = "gtm_brief_session_v1";

export type BriefSession = {
  label: string;
  url: string;
  brief: AccountBrief;
  currentHistoryId: string | null;
  linkedinPosts: LinkedInPost[];
  ownIntel: string;
};

export function saveBriefSession(session: BriefSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* sessionStorage unavailable */
  }
}

export function loadBriefSession(): BriefSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BriefSession;
  } catch {
    return null;
  }
}

export function clearBriefSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
