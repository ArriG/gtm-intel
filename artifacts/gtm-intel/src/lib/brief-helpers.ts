import type { AccountBrief, CallPriority } from "@workspace/api-client-react";

export function fitHighlights(brief: AccountBrief): string[] {
  if (brief.icpFitScore.highlights?.length) return brief.icpFitScore.highlights;
  if (brief.icpFitScore.reason?.trim()) return [brief.icpFitScore.reason.trim()];
  return [];
}

export function worldBullets(brief: AccountBrief): string[] {
  if (brief.theirWorld?.bullets?.length) return brief.theirWorld.bullets;
  const narrative = brief.theirWorld?.narrative?.trim();
  if (!narrative) return [];
  return narrative.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 4);
}

export function snapshotPainPoints(brief: AccountBrief): string[] {
  return brief.companySnapshot.possiblePainPoints?.filter(Boolean) ?? [];
}

export function callPriorityLabel(priority: CallPriority): string {
  switch (priority) {
    case "hot": return "Call this week";
    case "warm": return "Worth reaching out";
    case "watch": return "Save for later";
    case "skip": return "Skip for now";
  }
}

export function callPriorityStyles(priority: CallPriority): {
  badge: string;
  border: string;
  bg: string;
  text: string;
} {
  switch (priority) {
    case "hot":
      return {
        badge: "bg-green-100 text-green-800 border-green-300",
        border: "border-green-300",
        bg: "bg-green-50/80",
        text: "text-green-900",
      };
    case "warm":
      return {
        badge: "bg-amber-100 text-amber-900 border-amber-300",
        border: "border-amber-300",
        bg: "bg-amber-50/80",
        text: "text-amber-950",
      };
    case "watch":
      return {
        badge: "bg-sky-100 text-sky-900 border-sky-300",
        border: "border-sky-300",
        bg: "bg-sky-50/50",
        text: "text-sky-950",
      };
    case "skip":
      return {
        badge: "bg-muted text-muted-foreground border-border",
        border: "border-border",
        bg: "bg-secondary/50",
        text: "text-foreground",
      };
  }
}

export function buyerDisplayName(member: { name?: string; title: string }): string {
  const name = member.name?.trim();
  return name ? `${name} · ${member.title}` : member.title;
}
