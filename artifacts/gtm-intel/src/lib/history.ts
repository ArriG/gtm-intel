import { useEffect, useState } from "react";
import type { AccountBrief } from "@workspace/api-client-react";

export interface HistoryEntry {
  id: string;
  label: string;
  url: string;
  icpScore: number;
  savedAt: string;
  brief: AccountBrief;
}

const HISTORY_KEY = "gtm_brief_history_v2";
const HISTORY_EVENT = "gtm:history-changed";
const MAX_ENTRIES = 10;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(entry: HistoryEntry) {
  try {
    const existing = loadHistory().filter(h => h.url !== entry.url);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...existing].slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    /* localStorage full or unavailable */
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function useHistory(): HistoryEntry[] {
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  useEffect(() => {
    const onChange = () => setHistory(loadHistory());
    window.addEventListener(HISTORY_EVENT, onChange);
    return () => window.removeEventListener(HISTORY_EVENT, onChange);
  }, []);
  return history;
}
