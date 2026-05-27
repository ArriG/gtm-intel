export const BRIEF_RESPONSE_FORMAT = `For each source that produces useful information, record it in the sources arrays using these types: "web", "abn", "asic", "seek_job", "linkedin", "industry_press", "assumed".
Confidence levels: "verified" = direct quote or official filing, "informed" = strong contextual signal, "assumed" = educated inference.

RESPONSE FORMAT — return ONLY valid JSON, no markdown, no preamble.
Structure the brief as a CALL DECISION tool. Populate call-ready fields first in your reasoning, then background.

{
  "callDecision": {
    "priority": "hot | warm | watch | skip",
    "justification": "One sentence — should the seller call this account this week, and why",
    "sources": [
      { "type": "industry_press", "label": "Trigger source", "detail": "What drove the priority", "url": "", "confidence": "verified" }
    ]
  },
  "coldEmail": {
    "opener": "One sentence the AE can say on a cold call or email — must reference a verified or informed signal with date if 6+ months old",
    "fullEmail": "Subject: [subject line]\\n\\nHi [First name],\\n\\n[Opening referencing a specific signal]\\n\\n[Value statement — outcome not features]\\n\\nWorth a 15-minute call to see if it fits?\\n\\n[Your name]",
    "sources": [
      { "type": "seek_job", "label": "Signal used", "detail": "What informed the opener", "url": "", "confidence": "informed" }
    ]
  },
  "recentTriggers": {
    "items": [
      { "event": "Specific trigger event", "significance": "Why this matters for outreach", "recency": "e.g. 3 weeks ago" }
    ],
    "sources": [
      { "type": "industry_press", "label": "Source label", "detail": "What you found", "url": "", "confidence": "verified" }
    ]
  },
  "buyingCommittee": [
    {
      "name": "Jane Smith or empty string if not found",
      "title": "Principal",
      "buyingRole": "decision_maker",
      "painPoint": "Specific pain for this person at this company — their language, not generic SaaS",
      "linkedinSignal": "Exact quote from their post if found, otherwise empty string",
      "sources": [
        { "type": "linkedin", "label": "LinkedIn post", "detail": "What they posted", "url": "", "confidence": "verified" }
      ]
    }
  ],
  "discoveryQuestions": [
    {
      "question": "Open question tied to a specific finding — max 18 words",
      "tiedToSignal": "The signal this question references",
      "confidence": "informed"
    }
  ],
  "manualResearchTips": [
    {
      "tip": "Spend 10 minutes in [forum/community] before calling",
      "reason": "Why AI could not reach this source"
    }
  ],
  "companySnapshot": {
    "size": "e.g. 50-200 employees",
    "industry": "e.g. Dental Practice",
    "location": "e.g. Manchester, UK",
    "fundingStage": "e.g. Bootstrapped or Unknown",
    "abn": "e.g. 12 345 678 901 or Not found",
    "techStack": "e.g. SOE, Xero — or Not detected",
    "possiblePainPoints": [
      "Specific likely pain from research — max 15 words each"
    ],
    "sources": [
      { "type": "web", "label": "Company website", "detail": "Key facts found", "url": "", "confidence": "verified" }
    ]
  },
  "icpFitScore": {
    "score": 7,
    "highlights": [
      "Why fit or no-fit vs seller context — max 3 bullets"
    ],
    "reason": "Optional legacy one-liner",
    "sources": [
      { "type": "assumed", "label": "Inferred from profile", "detail": "Reasoning", "url": "", "confidence": "assumed" }
    ]
  },
  "theirWorld": {
    "bullets": [
      "Pressure or priority in present tense — 3-4 bullets max"
    ],
    "confidence": "medium",
    "sources": [
      { "type": "seek_job", "label": "Job posting", "detail": "Operational signal", "url": "", "confidence": "informed" }
    ]
  },
  "sourceSummary": {
    "totalSources": 4,
    "sourceTypes": ["web", "asic", "seek_job", "industry_press"],
    "australianSources": 2,
    "overallConfidence": "medium",
    "confidenceReason": "Brief based on N verified and N informed sources."
  }
}

RULES — call-ready output:
- callDecision.priority: use hot (2+ recent verified triggers), warm (1 trigger or strong fit + hiring), watch (structural fit only), skip (no fit + no signals). When in doubt, downgrade.
- callDecision.justification: one sentence only. Must match the priority rubric in the constitution.
- coldEmail.opener: REQUIRED — never return an empty string. Reference a specific signal. Tag stale signals (6+ months) with the date inline.
- recentTriggers.items: 0-2 items. Empty array is OK if nothing found — do not invent triggers.
- buyingCommittee: up to 3 relevant decision-makers maximum — quality over count. Include name when found. Empty linkedinSignal is OK when no public post was found.
- discoveryQuestions: exactly 3 when possible. Each must reference a specific finding — never generic discovery scripts.
- manualResearchTips: 2-4 items from sector pack manual tips when relevant; honest about what AI could not search.
- companySnapshot, icpFitScore, theirWorld: background context — still required but keep concise.
- Be specific, not generic. Mark inferences as "assumed" in sources.
- Always include all top-level keys even if some arrays are empty.
- CRITICAL: All JSON string values must be plain text only. Never include HTML, XML, <cite> tags, or any markup.`;
