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
    "fundingStage": "Public (SIX: ZURN) or Private — factual only"
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
- REGION SCOPE IS MANDATORY: entities[] must contain ONLY full-depth operating entities for the scoped region in the user message. Every other-region entity is NAME ONLY in unmappedEntities[] — no country, context, fitTier, or sources for out-of-scope entities.
- Do NOT run web searches to discover or detail out-of-scope regions — spend all searches on in-scope subsidiaries and regulators only.
- Identify only real, publicly verifiable operating entities — NOT named executives.
- Every entity MUST have "buyers": [] (empty array). Leadership is filled in a separate pass.
- Up to 8 entities per in-scope region bucket, maximum 20 entities total in entities[] (all in-scope).
- If more in-scope entities exist than the cap, list omitted in-scope names in unmappedEntities[] too.
- Populate outreachSources[] with 2-4 public sources worth checking next (annual reports, regulator registers, IR pages, trade press) — use URLs you already found or well-known public pages; do NOT run extra web searches just for outreachSources.
- Prefer strong fit entities, then moderate, then skip when selecting which to include.
- companySnapshot is a lean factual header only (size, industry, location, fundingStage) — fill from known facts; do NOT spend web searches on snapshot fields. Deeper company context belongs in Brief mode, not Mapping.
- entity context is brief (1-2 sentences max) — do NOT run per-entity news searches in Pass 1.
- Do NOT fetch PDF filings, SFCR documents, or regulator register exports in Pass 1 — Pass 2 handles leadership from those sources.
- fitTier is factual alignment (geography, industry, business line) — NOT a sales heat score.
- Use at most 3 web searches total for this structure pass — prioritise entity discovery; stop searching once you have solid entity coverage.
- Set isSingleEntity=true if the target is not a federated multi-entity enterprise.
- CRITICAL: no markdown, no preamble — raw JSON only.`;
