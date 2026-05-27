export type BriefStatus =
  | "not_contacted"
  | "reached_out"
  | "replied"
  | "meeting_booked"
  | "dead"
  | "won";

export const BRIEF_STATUS_VALUES: BriefStatus[] = [
  "not_contacted",
  "reached_out",
  "replied",
  "meeting_booked",
  "dead",
  "won",
];

export const BRIEF_STATUS_LABELS: Record<BriefStatus, string> = {
  not_contacted: "Not contacted",
  reached_out: "Reached out",
  replied: "Replied",
  meeting_booked: "Meeting booked",
  dead: "Closed — no fit",
  won: "Closed — won",
};

export function briefStatusLabel(status: BriefStatus): string {
  return BRIEF_STATUS_LABELS[status] ?? status;
}

export function normaliseBriefStatus(value: unknown): BriefStatus {
  if (typeof value === "string" && BRIEF_STATUS_VALUES.includes(value as BriefStatus)) {
    return value as BriefStatus;
  }
  return "not_contacted";
}

export type BriefStatusPillVariant = "muted" | "blue" | "amber" | "green" | "greenSolid" | "neutral";

export function briefStatusPillVariant(status: BriefStatus): BriefStatusPillVariant {
  switch (status) {
    case "not_contacted":
      return "muted";
    case "reached_out":
      return "blue";
    case "replied":
      return "amber";
    case "meeting_booked":
      return "green";
    case "won":
      return "greenSolid";
    case "dead":
      return "neutral";
  }
}

export const BRIEF_STATUS_PILL_CLASSES: Record<BriefStatusPillVariant, string> = {
  muted: "bg-muted text-muted-foreground border-border",
  blue: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  amber: "bg-amber-500/10 text-amber-800 border-amber-500/20",
  green: "bg-green-500/10 text-green-700 border-green-500/20",
  greenSolid: "bg-green-600 text-white border-green-600",
  neutral: "bg-secondary text-muted-foreground border-border",
};
