export const ACCOUNT_MAP_RESPONSE_FORMAT = `ACCOUNT MAP OUTPUT — factual structured intelligence only.

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
      "context": "1-3 factual sentences on recent events — tech, regulation, leadership. NO coaching.",
      "buyingAutonomy": "independent | group_gated | mixed | unknown",
      "fitTier": "strong | moderate | skip",
      "fitReason": "One factual sentence on alignment to seller profile.",
      "buyers": [
        {
          "name": "Full name",
          "role": "e.g. Chief Actuary, COO, CTO, or Managing Director",
          "sourceUrl": "https://verifiable-source.example",
          "sourceTitle": "e.g. Zurich UK Annual Report 2024",
          "tenureNote": "appointed Jan 2024"
        }
      ],
      "leadershipNote": "Optional — honest one-liner like 'Searched FCA SMCR register and 2024 annual report — only CEO publicly disclosed; check SFCR PDF for Chief Actuary.' Required when buyers is empty or has fewer than 2 entries.",
      "sources": ["https://...", "https://..."]
    }
  ],
  "unmappedEntities": ["Names of real entities omitted due to caps"],
  "limitations": "Honest caveats on coverage depth — especially non-European sourcing.",
  "isSingleEntity": false
}

MAPPING RULES:
- Map the company GLOBALLY into the fixed region buckets above.
- Identify only real, publicly verifiable entities and named executives.
- Up to 8 entities per region, maximum 20 entities total in entities[].
- If more entities exist, list ALL omitted names in unmappedEntities[].
- Populate outreachSources[] with 3-6 public sources worth checking next (annual reports, regulator registers, IR pages, trade press) — especially for unmapped entities.
- Prefer strong fit entities, then moderate, then skip when selecting which to include in entities[].
- Up to 3 buyers per entity — named executives only (Chief Actuary, Actuary, COO, CTO/CIO, CRO, CEO/MD, CUO when verified). Omit any buyer without a verifiable sourceUrl. NEVER use placeholder names — return an empty buyers array instead.
- Prefer ROLE DIVERSITY over seniority duplicates: 1 executive lead (CEO/MD), 1 operations/risk role (COO/CRO/CUO), 1 technical/actuarial role (Chief Actuary/CTO/CIO). Don't return three near-duplicate senior managers.
- Use local title aliases when verifying: Chief Actuary = Responsible Actuary (CH FINMA), Verantwortlicher Aktuar (DE BaFin), Appointed Actuary (IE), SMF20 (UK SMCR). CRO = SMF4 (UK). Search regulator filings, not just press releases.
- Populate leadershipNote when buyers is empty or has fewer than 2 named executives — explain WHAT you searched and WHERE the user should look next (e.g. "Searched SFCR and BaFin Vorstand register — only Group CEO disclosed publicly; UK Chief Actuary likely listed in SMF20 register.").
- companySnapshot is a lean factual header only — NO call decision, NO opener, NO ICP score, NO discovery questions. Deeper context belongs in Brief mode.
- fitTier is factual alignment (geography, industry, business line, buyer match) — NOT a sales heat score.
- For non-European regions, note reduced regulator depth in entity sources[] and limitations.
- Set isSingleEntity=true if the target is not a federated multi-entity enterprise.
- Use at most 10 web searches total for the entire mapping pass.
- CRITICAL: no markdown, no preamble — raw JSON only.`;
