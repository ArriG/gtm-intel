import { stripCitationTags } from "./brief-ai";
import { MAX_BUYERS } from "./brief-motion";

type CallPriority = "hot" | "warm" | "watch" | "skip";

type TriggerItem = {
  event?: string;
  significance?: string;
  recency?: string;
};

type BuyingCommitteeMember = {
  name?: string;
  title?: string;
  painPoint?: string;
  linkedinSignal?: string;
};

export type BriefNormalizeMeta = {
  derivedOpener: boolean;
  derivedCallDecision: boolean;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function deriveCallDecision(brief: Record<string, unknown>): {
  priority: CallPriority;
  justification: string;
} {
  const triggers = validTriggers(asRecord(brief.recentTriggers)?.items);
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
    && typeof (member as BuyingCommitteeMember).linkedinSignal === "string"
    && (member as BuyingCommitteeMember).linkedinSignal!.trim().length > 0,
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

function deriveColdEmailOpener(brief: Record<string, unknown>): string {
  const triggers = validTriggers(asRecord(brief.recentTriggers)?.items);
  if (triggers.length > 0) {
    const trigger = triggers[0];
    const recencySuffix = trigger.recency ? ` (${trigger.recency})` : "";
    const significance = trigger.significance?.trim();
    if (significance) {
      return `I noticed ${trigger.event}${recencySuffix} — ${significance.charAt(0).toLowerCase()}${significance.slice(1)}. Worth a brief conversation?`;
    }
    return `I noticed ${trigger.event}${recencySuffix} — thought it might be worth a short conversation.`;
  }

  const committee = Array.isArray(brief.buyingCommittee) ? brief.buyingCommittee : [];
  const first = committee[0] as BuyingCommitteeMember | undefined;
  if (first?.linkedinSignal?.trim()) {
    const pain = first.painPoint?.trim() || "what you're prioritising this quarter";
    return `Your recent comment — "${first.linkedinSignal.trim()}" — stood out. I'd welcome a short chat about ${pain}.`;
  }

  if (first?.painPoint?.trim()) {
    const title = first.title?.trim() || "teams like yours";
    return `${title} often wrestle with ${first.painPoint.trim()} — worth exploring whether we could help.`;
  }

  const highlights = (brief.icpFitScore as { highlights?: string[] } | undefined)?.highlights;
  if (highlights?.[0]?.trim()) {
    return `Given ${highlights[0].trim()}, I thought a quick introduction might be useful.`;
  }

  const decision = asRecord(brief.callDecision);
  if (typeof decision?.justification === "string" && decision.justification.trim()) {
    return `Based on what we found — ${decision.justification.trim()} — I'd welcome a brief introduction.`;
  }

  return "";
}

function normalizeColdEmail(brief: Record<string, unknown>): { coldEmail: Record<string, unknown>; derivedOpener: boolean } {
  const existing = asRecord(brief.coldEmail) ?? {};
  const originalOpener = typeof existing.opener === "string" ? stripCitationTags(existing.opener).trim() : "";
  let opener = originalOpener;

  if (!opener) {
    opener = deriveColdEmailOpener(brief);
  }

  const fullEmail = typeof existing.fullEmail === "string" ? stripCitationTags(existing.fullEmail).trim() : "";

  return {
    derivedOpener: !originalOpener && Boolean(opener),
    coldEmail: {
      ...existing,
      opener,
      fullEmail: fullEmail || undefined,
      sources: Array.isArray(existing.sources) ? existing.sources : [],
    },
  };
}

function normalizeRecentTriggers(brief: Record<string, unknown>): void {
  const existing = asRecord(brief.recentTriggers);
  if (!existing) {
    brief.recentTriggers = { items: [], sources: [] };
    return;
  }

  if (!Array.isArray(existing.items)) {
    existing.items = validTriggers(existing.items);
  }
  if (!Array.isArray(existing.sources)) {
    existing.sources = [];
  }
}

function normalizeIcpFitScore(brief: Record<string, unknown>): void {
  const existing = asRecord(brief.icpFitScore);
  if (!existing) {
    brief.icpFitScore = { score: 0, highlights: [], sources: [] };
    return;
  }

  if (typeof existing.score !== "number") {
    existing.score = 0;
  }
  if (!Array.isArray(existing.highlights)) {
    existing.highlights = typeof existing.reason === "string" && existing.reason.trim()
      ? [existing.reason.trim()]
      : [];
  }
  if (!Array.isArray(existing.sources)) {
    existing.sources = [];
  }
}

function normalizeCompanySnapshot(brief: Record<string, unknown>): void {
  const existing = asRecord(brief.companySnapshot);
  if (!existing) {
    brief.companySnapshot = {
      size: "Unknown",
      industry: "Unknown",
      location: "Unknown",
      fundingStage: "Unknown",
      possiblePainPoints: [],
      sources: [],
    };
    return;
  }

  for (const key of ["size", "industry", "location", "fundingStage"] as const) {
    if (typeof existing[key] !== "string" || !existing[key].trim()) {
      existing[key] = "Unknown";
    }
  }
  if (!Array.isArray(existing.possiblePainPoints)) {
    existing.possiblePainPoints = [];
  }
  if (!Array.isArray(existing.sources)) {
    existing.sources = [];
  }
}

function normalizeTheirWorld(brief: Record<string, unknown>): void {
  const existing = asRecord(brief.theirWorld);
  if (!existing) {
    brief.theirWorld = { confidence: "assumed", bullets: [], sources: [] };
    return;
  }

  if (typeof existing.confidence !== "string" || !existing.confidence.trim()) {
    existing.confidence = "assumed";
  }
  if (!Array.isArray(existing.bullets)) {
    existing.bullets = typeof existing.narrative === "string" && existing.narrative.trim()
      ? [existing.narrative.trim()]
      : [];
  }
  if (!Array.isArray(existing.sources)) {
    existing.sources = [];
  }
}

export function normalizeColdEmailOnly(
  coldEmail: Record<string, unknown>,
  brief: Record<string, unknown>,
): { coldEmail: Record<string, unknown>; derivedOpener: boolean } {
  return normalizeColdEmail({ ...brief, coldEmail });
}

export function normalizeAccountBrief(brief: Record<string, unknown>): Record<string, unknown> {
  const { normalized, meta: _meta } = normalizeAccountBriefWithMeta(brief);
  return normalized;
}

export function normalizeAccountBriefWithMeta(brief: Record<string, unknown>): {
  normalized: Record<string, unknown>;
  meta: BriefNormalizeMeta;
} {
  const normalized = { ...brief };
  const meta: BriefNormalizeMeta = {
    derivedOpener: false,
    derivedCallDecision: false,
  };

  normalizeCompanySnapshot(normalized);
  normalizeIcpFitScore(normalized);
  normalizeRecentTriggers(normalized);
  normalizeTheirWorld(normalized);

  if (!normalized.callDecision || typeof normalized.callDecision !== "object") {
    normalized.callDecision = deriveCallDecision(normalized);
    meta.derivedCallDecision = true;
  }

  if (!Array.isArray(normalized.discoveryQuestions)) {
    normalized.discoveryQuestions = [];
  }

  if (!Array.isArray(normalized.manualResearchTips)) {
    normalized.manualResearchTips = [];
  }

  if (Array.isArray(normalized.buyingCommittee) && normalized.buyingCommittee.length > MAX_BUYERS) {
    normalized.buyingCommittee = normalized.buyingCommittee.slice(0, MAX_BUYERS);
  }

  const coldEmailResult = normalizeColdEmail(normalized);
  normalized.coldEmail = coldEmailResult.coldEmail;
  meta.derivedOpener = coldEmailResult.derivedOpener;

  return { normalized, meta };
}
