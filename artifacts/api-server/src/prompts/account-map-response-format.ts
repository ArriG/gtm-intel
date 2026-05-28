export const ACCOUNT_MAP_RESPONSE_FORMAT = `ACCOUNT MAP OUTPUT — factual structured intelligence only.

Return ONLY valid JSON with this exact shape:
{
  "parent": {
    "name": "Group legal name",
    "description": "One factual paragraph — HQ, industry, scale. No sales coaching.",
    "headquartersCountry": "e.g. Switzerland",
    "industry": "e.g. Insurance"
  },
  "entities": [
    {
      "name": "Operating entity legal name",
      "country": "Specific country",
      "region": "europe | north_america | asia_pacific | latin_america | middle_east_africa | group_unallocated",
      "businessLine": "e.g. Property & Casualty",
      "parentRelationship": "subsidiary | branch | affiliate | division | joint_venture",
      "context": "1-3 factual sentences on recent events — tech, regulation, leadership. NO coaching.",
      "buyingAutonomy": "independent | group_gated | mixed | unknown",
      "fitTier": "strong | moderate | skip",
      "fitReason": "One factual sentence on alignment to seller profile.",
      "buyers": [
        {
          "name": "Full name",
          "role": "e.g. Chief Underwriting Officer",
          "sourceUrl": "https://verifiable-source.example",
          "sourceTitle": "e.g. Zurich UK Annual Report 2024",
          "tenureNote": "appointed Jan 2024"
        }
      ],
      "sources": ["https://...", "https://..."]
    }
  ],
  "unmappedEntities": ["Names of real entities omitted due to caps"],
  "limitations": "Honest caveats on coverage depth.",
  "isSingleEntity": false
}

MAPPING RULES:
- Map the company GLOBALLY into the fixed region buckets above.
- Identify only real, publicly verifiable entities and named executives.
- Up to 5 entities per region, maximum 12 entities total in entities[].
- If more entities exist, list omitted names in unmappedEntities[].
- Prefer strong fit entities, then moderate, then skip when selecting which to include.
- Up to 3 buyers per entity aligned to seller buyer titles — omit any buyer without a verifiable sourceUrl.
- fitTier is factual alignment (geography, industry, business line, buyer match) — NOT a sales heat score.
- context must be factual recent events only — NO call decision, NO opener, NO why-now, NO discovery questions.
- For non-European regions, note reduced regulator depth in entity sources[] and limitations.
- Set isSingleEntity=true if the target is not a federated multi-entity enterprise.
- Use at most 7 web searches total for the entire mapping pass.
- CRITICAL: no markdown, no preamble — raw JSON only.`;
