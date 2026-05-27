import { useEffect, useState } from "react";
import type { AccountBrief } from "@workspace/api-client-react";
import { normaliseBriefStatus, type BriefStatus } from "./brief-status";

export type { BriefStatus };

export type StoredReply = {
  text: string;
  receivedAt: string;
};

export type StoredNextTouch = {
  opener: string;
  suggestion: string;
  generatedAt: string;
  tone: string;
};

export interface HistoryEntry {
  id: string;
  label: string;
  url: string;
  icpScore: number;
  savedAt: string;
  brief: AccountBrief;
  status?: BriefStatus;
  lastTouchedAt?: string | null;
  latestReply?: StoredReply | null;
  nextTouch?: StoredNextTouch | null;
}

const HISTORY_KEY = "gtm_brief_history_v2";
const HISTORY_EVENT = "gtm:history-changed";
const MAX_ENTRIES = 10;

function normaliseStoredReply(raw: unknown): StoredReply | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<StoredReply>;
  if (!value.text?.trim() || !value.receivedAt) return null;
  return { text: value.text.trim(), receivedAt: value.receivedAt };
}

function normaliseStoredNextTouch(raw: unknown): StoredNextTouch | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<StoredNextTouch>;
  if (!value.opener?.trim() || !value.suggestion?.trim() || !value.generatedAt || !value.tone?.trim()) return null;
  return {
    opener: value.opener.trim(),
    suggestion: value.suggestion.trim(),
    generatedAt: value.generatedAt,
    tone: value.tone.trim(),
  };
}

function normaliseHistoryEntry(raw: Partial<HistoryEntry>): HistoryEntry | null {
  if (!raw.id || !raw.label || !raw.url || !raw.brief) return null;

  return {
    id: raw.id,
    label: raw.label,
    url: raw.url,
    icpScore: typeof raw.icpScore === "number" ? raw.icpScore : 0,
    savedAt: raw.savedAt ?? new Date().toISOString(),
    brief: raw.brief,
    status: normaliseBriefStatus(raw.status),
    lastTouchedAt: raw.lastTouchedAt ?? null,
    latestReply: normaliseStoredReply(raw.latestReply),
    nextTouch: normaliseStoredNextTouch(raw.nextTouch),
  };
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<HistoryEntry>[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(entry => normaliseHistoryEntry(entry))
      .filter((entry): entry is HistoryEntry => entry !== null);
  } catch {
    return [];
  }
}

export function saveToHistory(entry: HistoryEntry) {
  try {
    const existing = loadHistory();
    const previous = existing.find(h => h.url === entry.url);
    const merged: HistoryEntry = previous
      ? {
          ...entry,
          status: previous.status ?? entry.status ?? "not_contacted",
          lastTouchedAt: previous.lastTouchedAt ?? entry.lastTouchedAt ?? null,
          latestReply: previous.latestReply ?? entry.latestReply ?? null,
          nextTouch: previous.nextTouch ?? entry.nextTouch ?? null,
        }
      : {
          ...entry,
          status: entry.status ?? "not_contacted",
          lastTouchedAt: entry.lastTouchedAt ?? null,
          latestReply: entry.latestReply ?? null,
          nextTouch: entry.nextTouch ?? null,
        };

    const next = [merged, ...existing.filter(h => h.url !== entry.url)].slice(0, MAX_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    /* localStorage full or unavailable */
  }
}

export function updateHistoryEntry(
  id: string,
  updates: Partial<Pick<HistoryEntry, "status" | "lastTouchedAt" | "latestReply" | "nextTouch">>,
) {
  try {
    const next = loadHistory().map(entry =>
      entry.id === id ? { ...entry, ...updates } : entry,
    );
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    /* localStorage full or unavailable */
  }
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return loadHistory().find(entry => entry.id === id);
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
