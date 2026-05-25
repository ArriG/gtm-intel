export const BRIEF_RESPONSE_FORMAT = `For each source that produces useful information, record it in the sources arrays using these types: "web", "abn", "asic", "seek_job", "linkedin", "industry_press", "assumed".
Confidence levels: "verified" = direct quote or official filing, "informed" = strong contextual signal, "assumed" = educated inference.

RESPONSE FORMAT — return ONLY valid JSON, no markdown, no preamble:

{
  "companySnapshot": {
    "size": "e.g. 50-200 employees",
    "industry": "e.g. Financial Services / Mortgage Broking",
    "location": "e.g. Sydney, NSW, Australia",
    "fundingStage": "e.g. Series A or Bootstrapped or Unknown",
    "abn": "e.g. 12 345 678 901 or Not found",
    "techStack": "e.g. Salesforce, Xero — comma-separated, or Not detected",
    "possiblePainPoints": [
      "Specific likely pain from job ads or press — e.g. Manual underwriting workflows slowing quote turnaround",
      "Second pain inferred from hiring or positioning — max 12 words each"
    ],
    "sources": [
      { "type": "web", "label": "Company website", "detail": "Key facts found", "url": "", "confidence": "verified" }
    ]
  },
  "icpFitScore": {
    "score": 7,
    "highlights": [
      "Matches enterprise UK insurer profile you sell into",
      "Hiring underwriters signals workflow pain you solve",
      "Weak signal: no recent trigger — fit is structural not timing"
    ],
    "reason": "Optional legacy one-liner if needed",
    "sources": [
      { "type": "assumed", "label": "Inferred from company profile", "detail": "Reasoning", "url": "", "confidence": "assumed" }
    ]
  },
  "buyingCommittee": [
    {
      "title": "CFO",
      "painPoint": "Specific pain point for this persona at this company.",
      "linkedinSignal": "Direct quote from their LinkedIn post if found, otherwise empty string",
      "sources": [
        { "type": "linkedin", "label": "LinkedIn post", "detail": "What they posted", "url": "", "confidence": "verified" }
      ]
    },
    {
      "title": "Head of Operations",
      "painPoint": "Specific pain point inferred from job postings or website.",
      "linkedinSignal": "",
      "sources": [
        { "type": "seek_job", "label": "Seek job posting", "detail": "Signal from job description", "url": "", "confidence": "informed" }
      ]
    },
    {
      "title": "CEO / Founder",
      "painPoint": "Strategic pain point for this persona.",
      "linkedinSignal": "",
      "sources": [
        { "type": "web", "label": "Company website", "detail": "Inferred from positioning", "url": "", "confidence": "assumed" }
      ]
    }
  ],
  "theirWorld": {
    "bullets": [
      "Under pressure to cut quote turnaround — hiring ops roles to fix it",
      "Regulatory scrutiny increasing; need audit-ready underwriting trails",
      "Leadership publicly prioritising digital transformation this year"
    ],
    "confidence": "medium",
    "sources": [
      { "type": "seek_job", "label": "Job posting", "detail": "Specific operational signal", "url": "", "confidence": "informed" },
      { "type": "industry_press", "label": "Press", "detail": "Market context", "url": "", "confidence": "verified" }
    ]
  },
  "recentTriggers": {
    "items": [
      { "event": "Specific trigger event", "significance": "Why this matters for outreach", "recency": "e.g. 3 weeks ago" },
      { "event": "Second trigger event", "significance": "Why this matters", "recency": "e.g. 2 months ago" }
    ],
    "sources": [
      { "type": "industry_press", "label": "Source label", "detail": "What you found", "url": "", "confidence": "verified" }
    ]
  },
  "coldEmail": {
    "opener": "One compelling personalised sentence referencing a specific verified signal.",
    "fullEmail": "Subject: [subject line]\\n\\nHi [First name],\\n\\n[Opening referencing a specific signal — job posting, news, or LinkedIn post]\\n\\n[Value statement relevant to their situation — outcome not features]\\n\\nWorth a 15-minute call to see if it fits?\\n\\n[Your name]",
    "sources": [
      { "type": "seek_job", "label": "Signal used for personalisation", "detail": "What informed the opener", "url": "", "confidence": "informed" }
    ]
  },
  "sourceSummary": {
    "totalSources": 4,
    "sourceTypes": ["web", "abn", "seek_job", "industry_press"],
    "australianSources": 2,
    "overallConfidence": "medium",
    "confidenceReason": "Brief based on 2 verified sources and 2 informed inferences. Add LinkedIn context to improve."
  }
}

RULES:
- Be specific, not generic. Use real facts from your searches.
- Mark inferences clearly as type "assumed" — do not present guesses as facts.
- companySnapshot.possiblePainPoints: 2-4 bullets, each under 15 words, grounded in research (jobs, press, website). Mark inferred pains in sources as "assumed" or "informed".
- icpFitScore.highlights: exactly 2-3 bullets — why fit/no-fit vs seller context. No filler.
- theirWorld.bullets: exactly 3-4 bullets — pressures, priorities, why-now. Present tense. No prose paragraph.
- The fullEmail must reference at least one specific signal from your research.
- Keep the entire JSON response concise — quality over length, no fluff.
- Always include all 6 top-level keys even if some sections have limited data.
- CRITICAL: All JSON string values must be plain text only. Never include HTML, XML, <cite> tags, or any markup.`;
