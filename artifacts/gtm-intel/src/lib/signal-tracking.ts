import type { HistoryEntry } from "./history";
import { visibleSignals } from "./history";

export function countWatchedAccounts(history: HistoryEntry[]): number {
  return history.filter(entry => entry.watched !== false).length;
}

export function countSignalsThisWeek(history: HistoryEntry[]): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let count = 0;

  for (const entry of history) {
    if (entry.watched === false) continue;
    for (const signal of visibleSignals(entry)) {
      const scanned = new Date(signal.scannedAt).getTime();
      if (!Number.isNaN(scanned) && scanned >= weekAgo) count++;
    }
  }

  return count;
}

export function countReadyToReengage(history: HistoryEntry[]): number {
  return history.filter(entry => {
    if (entry.watched === false) return false;

    const created = new Date(entry.savedAt).getTime();
    if (Number.isNaN(created)) return false;

    return visibleSignals(entry).some(signal => {
      const scanned = new Date(signal.scannedAt).getTime();
      return !Number.isNaN(scanned) && scanned > created;
    });
  }).length;
}

export function formatRelativeScanTime(iso: string | null | undefined): string {
  if (!iso) return "Never scanned";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Never scanned";

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatSignalDate(signal: { occurredAt?: string | null; scannedAt: string }): string {
  const iso = signal.occurredAt ?? signal.scannedAt;
  return formatRelativeScanTime(iso);
}

export function sortWatchedBriefs(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort((a, b) => {
    const aTime = a.lastScannedAt ? new Date(a.lastScannedAt).getTime() : 0;
    const bTime = b.lastScannedAt ? new Date(b.lastScannedAt).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });
}
