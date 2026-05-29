export const ACCOUNT_MAP_STRUCTURE_FORMAT = `ACCOUNT MAP — PASS 1 (STRUCTURE ONLY). Factual structured intelligence. Do NOT search for or return named executives in this pass.

Return ONLY valid JSON with this exact shape:
{
  "parent": {
    "name": "Group legal name",
    "description": "One factual paragraph — HQ, industry, scale. No sales coaching.",
    "headquartersCountry": "e.g. Switzerland",
    "industry": "e.g. Insurance"
  },
  "companySnapshot": {
    "size": "e.g. 50,000+ employees globally",
    "industry": "e.g. Insurance",
    "location": "e.g. Zurich, Switzerland (global operations)",
    "fundingStage": "Public (SIX: ZURN) or Private — factual only",
    "techStack": "Optional — only if verified from public sources",
    "possiblePainPoints": ["Factual operational themes from filings or press — not sales advice"],
    "sources": [{ "type": "web", "label": "Source name", "detail": "What was found", "url": "https://...", "confidence": "verified" }]
  },
  "groupBackground": {
    "confidence": "high | medium | low | assumed",
    "bullets": ["3-4 factual bullets on group-level pressures, priorities, and recent context"],
    "sources": [{ "type": "web", "label": "...", "detail": "...", "url": "https://...", "confidence": "verified" }]
  },
  "outreachSources": [
    {
      "label": "e.g. Group annual report — subsidiary list",
      "detail": "Why this source is worth checking before outreach to unmapped entities",
      "url": "https://...",
      "relatedEntity": "Optional entity name"
    }
  ],
  "entities": [
    {
      "name": "Operating entity legal name",
      "country": "Specific country",
      "region": "europe | north_america | asia_pacific | latin_america | middle_east_africa | group_unallocated",
      "businessLine": "e.g. Property & Casualty",
      "parentRelationship": "subsidiary | branch | affiliate | division | joint_venture",
      "context": "1-3 factual sentences on recent events — tech, regulation, leadership changes (no named people required). NO coaching.",
      "buyingAutonomy": "independent | group_gated | mixed | unknown",
      "fitTier": "strong | moderate | skip",
      "fitReason": "One factual sentence on alignment to seller profile.",
      "buyers": [],
      "sources": ["https://...", "https://..."]
    }
  ],
  "unmappedEntities": ["Names of real entities omitted due to caps"],
  "limitations": "Honest caveats on coverage depth — especially non-European sourcing.",
  "isSingleEntity": false
}

PASS 1 RULES:
- Map the company GLOBALLY into the fixed region buckets above.
- Identify only real, publicly verifiable operating entities — NOT named executives.
- Every entity MUST have "buyers": [] (empty array). Leadership is filled in a separate pass.
- Up to 8 entities per region, maximum 20 entities total in entities[].
- If more entities exist, list ALL omitted names in unmappedEntities[].
- Populate outreachSources[] with 3-6 public sources worth checking next (annual reports, regulator registers, IR pages, trade press).
- Prefer strong fit entities, then moderate, then skip when selecting which to include.
- companySnapshot and groupBackground must be factual group-level intelligence — NO call decision, NO opener, NO ICP score.
- fitTier is factual alignment (geography, industry, business line) — NOT a sales heat score.
- Use at most 10 web searches total for this structure pass — prioritise entity discovery and group context.
- Set isSingleEntity=true if the target is not a federated multi-entity enterprise.
- CRITICAL: no markdown, no preamble — raw JSON only.`;
