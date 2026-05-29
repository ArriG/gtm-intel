export const ACCOUNT_MAP_PEOPLE_FORMAT = `ACCOUNT MAP — PASS 2 (LEADERSHIP ONLY). Your ONLY job is named leadership for the entities listed in the user message.

Return ONLY valid JSON with this exact shape:
{
  "entities": [
    {
      "name": "Exact entity legal name as provided — must match character-for-character",
      "buyers": [
        {
          "name": "Full name",
          "role": "e.g. Chief Actuary, COO, CTO, CRO, or Managing Director",
          "sourceUrl": "https://verifiable-source.example",
          "sourceTitle": "e.g. Zurich UK Annual Report 2024",
          "tenureNote": "appointed Jan 2024"
        }
      ],
      "leadershipNote": "Required when buyers is empty or has fewer than 2 named executives",
      "sources": ["https://...", "https://..."]
    }
  ]
}

LEADERSHIP RULES (three honest states — never invent names):
1. NAMED + SOURCED → add to buyers[] (name, role, verifiable http sourceUrl, sourceTitle). No sourceUrl ⇒ NOT a buyer.
2. ROLE EXISTS, PERSON NOT PUBLIC → buyers[] empty or partial; leadershipNote MUST give the exact path to find them (regulator register, SFCR PDF, LinkedIn filter, annual report page).
3. NOT APPLICABLE → small entity with no such function; brief leadershipNote explaining why.

Other rules:
- Up to 3 buyers per entity. NEVER use placeholder names — empty buyers array instead.
- Prefer ROLE DIVERSITY over seniority duplicates: 1 executive lead (CEO/MD), 1 operations/risk role (COO/CRO/CUO), 1 technical/actuarial role (Chief Actuary/CTO/CIO).
- Use local title aliases: Chief Actuary = Responsible Actuary (CH FINMA), Verantwortlicher Aktuar (DE BaFin), Appointed Actuary (IE), SMF20 (UK SMCR). CRO = SMF4 (UK).
- Search regulator filings and annual report executive committee pages — not only press releases.
- Use at most 5 web searches total for this entire pass — focus searches on entities where actuarial/ops/tech roles are most likely public.
- Return one object per entity in the user list — same count, same names.
- CRITICAL: no markdown, no preamble — raw JSON only.`;
