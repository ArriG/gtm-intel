import { useEffect, useState } from "react";
import type { AccountBrief, AccountSignal } from "@workspace/api-client-react";
import { normaliseBriefStatus, type BriefStatus } from "./brief-status";

export type { BriefStatus };

export function signalDismissKey(type: string, headline: string): string {
  return `${type}|${headline.trim().toLowerCase()}`;
}

export function visibleSignals(entry: HistoryEntry): AccountSignal[] {
  const dismissed = new Set(entry.dismissedSignalKeys ?? []);
  return (entry.signals ?? []).filter(
    signal => !dismissed.has(signalDismissKey(signal.type, signal.headline)),
  );
}

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
  watched?: boolean;
  signals?: AccountSignal[];
  lastScannedAt?: string | null;
  dismissedSignalKeys?: string[];
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

function normaliseAccountSignals(raw: unknown): AccountSignal[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is AccountSignal =>
    Boolean(item)
    && typeof item === "object"
    && typeof (item as AccountSignal).id === "string"
    && typeof (item as AccountSignal).headline === "string"
    && typeof (item as AccountSignal).type === "string",
  );
}

function normaliseDismissedKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((key): key is string => typeof key === "string" && key.trim().length > 0);
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
    watched: raw.watched !== false,
    signals: normaliseAccountSignals(raw.signals),
    lastScannedAt: raw.lastScannedAt ?? null,
    dismissedSignalKeys: normaliseDismissedKeys(raw.dismissedSignalKeys),
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
          watched: previous.watched ?? entry.watched ?? true,
          signals: previous.signals ?? entry.signals ?? [],
          lastScannedAt: previous.lastScannedAt ?? entry.lastScannedAt ?? null,
          dismissedSignalKeys: previous.dismissedSignalKeys ?? entry.dismissedSignalKeys ?? [],
        }
      : {
          ...entry,
          status: entry.status ?? "not_contacted",
          lastTouchedAt: entry.lastTouchedAt ?? null,
          latestReply: entry.latestReply ?? null,
          nextTouch: entry.nextTouch ?? null,
          watched: entry.watched ?? true,
          signals: entry.signals ?? [],
          lastScannedAt: entry.lastScannedAt ?? null,
          dismissedSignalKeys: entry.dismissedSignalKeys ?? [],
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
  updates: Partial<Pick<HistoryEntry,
    | "status"
    | "lastTouchedAt"
    | "latestReply"
    | "nextTouch"
    | "watched"
    | "signals"
    | "lastScannedAt"
    | "dismissedSignalKeys"
  >>,
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

export function getWatchedBriefs(): HistoryEntry[] {
  return loadHistory().filter(entry => entry.watched !== false);
}

export function dismissBriefSignal(briefId: string, signal: AccountSignal) {
  const entry = getHistoryEntry(briefId);
  if (!entry) return;

  const key = signalDismissKey(signal.type, signal.headline);
  const dismissedSignalKeys = [...new Set([...(entry.dismissedSignalKeys ?? []), key])];
  updateHistoryEntry(briefId, { dismissedSignalKeys });
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
