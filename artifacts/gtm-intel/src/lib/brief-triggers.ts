import type { AccountBrief } from "@workspace/api-client-react";

type TriggerItem = NonNullable<AccountBrief["recentTriggers"]>["items"][number];

const PLACEHOLDER_PATTERNS = [
  "not found",
  "no recent",
  "unable to find",
  "none found",
  "no notable",
  "no significant",
  "no triggers",
  "no news",
];

export function isPlaceholderTrigger(event: string): boolean {
  const lower = event.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(p => lower.includes(p));
}

export function getValidTriggers(items?: TriggerItem[]): TriggerItem[] {
  return (items ?? []).filter(t => t.event?.trim() && !isPlaceholderTrigger(t.event));
}
