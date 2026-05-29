---
name: European Financial Services
version: 1
last_reviewed: 2026-05-28
applies_when:
  geographies: [UK, EU, EEA, Switzerland, Ireland, Germany, France, Netherlands, Italy, Spain]
  keywords:
    - insurance
    - reinsurance
    - financial services
    - banking
    - asset management
expected_seconds: 150
loading_label: Mapping structure and leadership — about 2–3 minutes...
---

# European Financial Services — Sector Pack

For mapping UK, EU, EEA, and Swiss insurers, reinsurers, banks, and regulated financial groups.

## Sources (priority order — max 7 per mapping pass)

Search across these sources for European entities. Stop each search after one attempt if nothing useful returns.

### 1. Corporate filings (by country)

UK: Companies House (`find-and-update.company-information.service.gov.uk`). Germany: Bundesanzeiger, Handelsregister. France: BODACC, INPI. Netherlands: KvK. Switzerland: Zefix, SHAB. Ireland: CRO. EU-wide: GLEIF / LEI register for legal entity hierarchy.

### 2. Insurance and financial regulators

UK: FCA, PRA. Germany: BaFin. France: ACPR, AMF. Netherlands: DNB, AFM. Switzerland: FINMA. Italy: IVASS, CONSOB. Spain: DGSFP. EU-wide: EIOPA, ESMA, ECB supervisory publications.

### 3. Annual reports and investor relations

Search `[entity name] annual report OR investor relations` for group structure, segment reporting, named executive committee members, and stated strategic priorities. Prefer PDF/HTML from official sites.

### 4. Regulatory frameworks (factual context only)

Note where relevant in entity context: Solvency II, IFRS 17, DORA (Digital Operational Resilience Act), UK Consumer Duty, EU Insurance Distribution Directive. Report facts only — no compliance advice.

### 5. European financial and insurance press

FT, Reuters, Bloomberg. Insurance Insider, Insurance Times, Post, Reinsurance News, The Actuary. Handelsblatt (DE), Les Echos (FR), Il Sole 24 Ore (IT), NRC (NL). Use for leadership moves and segment news in the last 12–18 months.

### 6. Leadership and org structure signals

Search `[entity name] CEO OR CUO OR Chief Actuary OR CRO site:linkedin.com OR annual report` for named heads. Only include names with a verifiable source URL.

For non-CEO roles, prefer these targeted queries:

- Chief Actuary (UK): `[entity] SMF20 site:fca.org.uk` or `[entity] SFCR chief actuary`
- Chief Actuary (CH): `[entity] Verantwortlicher Aktuar site:finma.ch` or `responsible actuary`
- Chief Actuary (DE): `[entity] Verantwortlicher Aktuar site:bafin.de`
- Vorstand / board members (DE): `[entity] Vorstand site:bafin.de` or Handelsregister filing
- COO / CRO (any): annual report executive committee page or `[entity] [role] site:linkedin.com`

### 7. Group structure and subsidiaries

Search `[parent group name] subsidiaries OR group structure site:gleif.org OR annual report` to place entities in the correct region bucket. Prefer official filings over press summaries.

## Common European insurance buyer titles (with local aliases)

- Chief Executive Officer / Managing Director — also: Vorstandsvorsitzender (DE), Directeur Général (FR), Amministratore Delegato (IT).
- Chief Underwriting Officer (CUO).
- Chief Actuary — also: Responsible Actuary (CH FINMA), Verantwortlicher Aktuar (DE BaFin), Appointed Actuary (IE Central Bank), Actuarial Function Holder (UK SMF20 under SMCR).
- Chief Risk Officer (CRO) — also: SMF4 Chief Risk Function (UK).
- Chief Operating Officer (Insurance) — also: Directeur des Opérations (FR), Chief Operations Officer.
- Chief Data / Analytics Officer, Head of Pricing.
- Chief Information / Technology Officer — also: DSI (FR Directeur des Systèmes d'Information).

## Role diversity guidance

When returning up to 3 buyers per entity, **prefer role diversity over seniority duplicates**:

1. One executive lead (CEO / MD / Country Head).
2. One operations / risk role (COO, CRO, CUO).
3. One technical / actuarial role (Chief Actuary, CTO/CIO, Head of Pricing).

Don't return three similar senior managers. If only the CEO is verifiable, return just the CEO and explain the gap in `leadershipNote`.

## Avoidance rules

- Do not invent subsidiary names — verify via filings, LEI, or annual report segment notes.
- Do not fabricate regulator actions — cite official register or regulator press release only.
- Do not conflate group HQ functions with operating subsidiaries.
- Non-European entities may appear in the map but should note reduced regulator depth in sources.
