type CallPriority = "hot" | "warm" | "watch" | "skip";

type TriggerItem = {
  event?: string;
  significance?: string;
  recency?: string;
};

function validTriggers(items: unknown): TriggerItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is TriggerItem =>
    typeof item === "object"
    && item !== null
    && typeof (item as TriggerItem).event === "string"
    && (item as TriggerItem).event!.trim().length > 0,
  );
}

function deriveCallDecision(brief: Record<string, unknown>): {
  priority: CallPriority;
  justification: string;
} {
  const triggers = validTriggers((brief.recentTriggers as { items?: unknown } | undefined)?.items);
  const score = typeof (brief.icpFitScore as { score?: unknown } | undefined)?.score === "number"
    ? (brief.icpFitScore as { score: number }).score
    : 0;
  const opener = (brief.coldEmail as { opener?: string } | undefined)?.opener?.trim();

  if (triggers.length >= 2) {
    return {
      priority: "hot",
      justification: `${triggers.length} recent triggers found — strong reason to reach out this week.`,
    };
  }

  if (triggers.length === 1) {
    const trigger = triggers[0];
    return {
      priority: "warm",
      justification: `Recent trigger: ${trigger.event}${trigger.recency ? ` (${trigger.recency})` : ""}.`,
    };
  }

  const committee = Array.isArray(brief.buyingCommittee) ? brief.buyingCommittee : [];
  const hasLinkedInSignal = committee.some(member =>
    typeof member === "object"
    && member !== null
    && typeof (member as { linkedinSignal?: string }).linkedinSignal === "string"
    && (member as { linkedinSignal: string }).linkedinSignal.trim().length > 0,
  );

  if (hasLinkedInSignal && score >= 6) {
    return {
      priority: "warm",
      justification: "Structural fit with a fresh leadership signal — worth a timely outreach.",
    };
  }

  if (score >= 7) {
    return {
      priority: "watch",
      justification: "Good structural fit but no fresh trigger — save for when timing improves.",
    };
  }

  if (score >= 5) {
    return {
      priority: "watch",
      justification: "Moderate fit with no recent triggers — monitor, don't call today.",
    };
  }

  if (opener) {
    return {
      priority: "watch",
      justification: "Limited fit signals — review research before deciding to call.",
    };
  }

  return {
    priority: "skip",
    justification: "Weak fit and no actionable triggers found in this research pass.",
  };
}

export function normalizeAccountBrief(brief: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...brief };

  if (!normalized.callDecision || typeof normalized.callDecision !== "object") {
    normalized.callDecision = deriveCallDecision(normalized);
  }

  if (!Array.isArray(normalized.discoveryQuestions)) {
    normalized.discoveryQuestions = [];
  }

  if (!Array.isArray(normalized.manualResearchTips)) {
    normalized.manualResearchTips = [];
  }

  if (Array.isArray(normalized.buyingCommittee) && normalized.buyingCommittee.length > 2) {
    normalized.buyingCommittee = normalized.buyingCommittee.slice(0, 2);
  }

  return normalized;
}
