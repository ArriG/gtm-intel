import type { YourCompanyInput } from "./brief-ai";

type MarketRegion = "uk" | "au" | "nz" | "us" | "global";

type SourceTemplate = {
  name: string;
  searchHint: string;
  reasoning: string;
};

const DEFAULT_AU_SOURCE_BLOCK = `When given a company URL, search across these 5 HIGH-PRIORITY sources only — do not spend time on other sources:

SOURCE 1 — Company website and blog: Read their homepage, about page, and any recent blog posts.

SOURCE 2 — Australian business registry: Search "site:abr.business.gov.au [company name]" for ABN details. Search "[company name] ASIC" for any regulatory filings or director information.

SOURCE 3 — Job postings: Search "[company name] jobs site:seek.com.au" — read job descriptions carefully. What roles are they hiring for? What does the job description reveal about their operational challenges? This is your highest-signal source for pain points.

SOURCE 4 — LinkedIn leadership signals: Search "site:linkedin.com [CEO name] [company name]" and "site:linkedin.com [CFO name] [company name]" for any recent public posts from their C-suite. Note exact quotes if found.

SOURCE 5 — Australian press: Search "[company name] site:afr.com OR site:smartcompany.com.au OR site:fintech.com.au" for recent coverage in the last 12 months.`;

function normaliseGeo(value: string): string {
  return value.trim().toLowerCase();
}

function detectPrimaryRegion(geographies: string[] | undefined): MarketRegion {
  const geos = (geographies ?? []).map(normaliseGeo);
  if (geos.some(g => g === "uk" || g.includes("united kingdom") || g.includes("britain") || g.includes("england"))) {
    return "uk";
  }
  if (geos.some(g => g === "au" || g.includes("australia"))) return "au";
  if (geos.some(g => g === "nz" || g.includes("new zealand"))) return "nz";
  if (geos.some(g => g === "us" || g.includes("united states") || g.includes("america"))) return "us";
  if (geos.length > 0) return "global";
  return "au";
}

function profileText(yourCompany: YourCompanyInput): string {
  return [
    yourCompany.industryServed,
    yourCompany.whoYouSellTo,
    yourCompany.oneLineDescription,
    yourCompany.whatYouSell,
    ...(yourCompany.buyerTitles ?? []),
    ...(yourCompany.painPointsSolved ?? []),
    yourCompany.painPoints,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isFinancialServices(text: string): boolean {
  return /bank|insur|re-?insur|underwrit|lender|mortgage|fintech|financial|wealth|asset manag|capital market/.test(text);
}

function isHealthcare(text: string): boolean {
  return /health|hospital|medical|dental|clinic|pharma|biotech/.test(text);
}

function isEnterprise(dealSize: YourCompanyInput["dealSize"]): boolean {
  return dealSize === "enterprise";
}

function isSmb(dealSize: YourCompanyInput["dealSize"]): boolean {
  return dealSize === "smb";
}

function websiteSource(): SourceTemplate {
  return {
    name: "Company website and blog",
    searchHint: "Read their homepage, about page, product pages, and any recent blog posts or newsroom updates.",
    reasoning: "Baseline company positioning, product focus, and self-described priorities.",
  };
}

function linkedInLeadershipSource(isEnterpriseMotion: boolean): SourceTemplate {
  return {
    name: "LinkedIn leadership signals",
    searchHint: isEnterpriseMotion
      ? 'Search "site:linkedin.com [CEO name] [company name]" and "site:linkedin.com [CFO or CRO name] [company name]" for recent C-suite posts. Note exact quotes if found.'
      : 'Search "site:linkedin.com [founder or owner name] [company name]" for recent posts about growth, hiring, or operational challenges.',
    reasoning: isEnterpriseMotion
      ? "Enterprise deals often hinge on executive priorities visible in public leadership commentary."
      : "Owner-operator and founder posts often reveal the sharpest near-term pain points.",
  };
}

function buildUkSources(text: string, enterprise: boolean): SourceTemplate[] {
  const financial = isFinancialServices(text);
  const sources: SourceTemplate[] = [
    websiteSource(),
    {
      name: "Companies House",
      searchHint: 'Search "site:find-and-update.company-information.service.gov.uk [company name]" for filings, directors, and status.',
      reasoning: "Official UK registry — confirms entity status, directors, and filing activity.",
    },
    {
      name: "UK job postings",
      searchHint: 'Search "[company name] jobs site:linkedin.com/jobs OR site:indeed.co.uk OR site:totaljobs.com" — read descriptions for hiring priorities and operational pain.',
      reasoning: "Job ads are the highest-signal source for operational challenges and growth bets.",
    },
    linkedInLeadershipSource(enterprise),
  ];

  if (financial) {
    sources.push({
      name: enterprise ? "UK financial & insurance press" : "UK business press",
      searchHint: enterprise
        ? 'Search "[company name] site:ft.com OR site:insurancetimes.co.uk OR site:reinsurancene.ws OR site:thebanker.com" for coverage in the last 12 months.'
        : 'Search "[company name] site:business-live.co.uk OR site:cityam.com OR site:insurancetimes.co.uk" for recent coverage.',
      reasoning: "Trade and national press covering banks, insurers, and reinsurers in the seller's market.",
    });
    if (enterprise) {
      sources.push({
        name: "FCA register",
        searchHint: 'Search "site:register.fca.org.uk [company name]" for authorised firms and regulatory context.',
        reasoning: "Useful for regulated financial institutions and enterprise compliance-led buying cycles.",
      });
    }
  } else if (isHealthcare(text)) {
    sources.push({
      name: "UK healthcare press",
      searchHint: 'Search "[company name] site:healthcareitnews.com OR site:nhs.uk OR site:digitalhealth.net" for recent coverage or partnerships.',
      reasoning: "Healthcare-specific signals for providers and health-tech targets in the UK.",
    });
  } else {
    sources.push({
      name: "UK business press",
      searchHint: enterprise
        ? 'Search "[company name] site:ft.com OR site:business-live.co.uk OR site:cityam.com" for recent coverage in the last 12 months.'
        : 'Search "[company name] site:business-live.co.uk OR site:smallbusiness.co.uk OR site:cityam.com" for recent local business coverage.',
      reasoning: enterprise
        ? "National and regional business press for mid-market and enterprise targets."
        : "Local and SMB-focused press often surfaces owner priorities and growth moves.",
    });
  }

  return sources;
}

function buildAuSources(enterprise: boolean): SourceTemplate[] {
  return [
    websiteSource(),
    {
      name: "Australian business registry",
      searchHint: 'Search "site:abr.business.gov.au [company name]" for ABN details. Search "[company name] ASIC" for regulatory filings or director information.',
      reasoning: "Confirms entity details and any regulatory signals for AU targets.",
    },
    {
      name: "Seek job postings",
      searchHint: 'Search "[company name] jobs site:seek.com.au" — read job descriptions for hiring priorities and operational pain.',
      reasoning: "Highest-signal AU source for pain points hidden in job descriptions.",
    },
    linkedInLeadershipSource(enterprise),
    {
      name: "Australian press",
      searchHint: 'Search "[company name] site:afr.com OR site:smartcompany.com.au OR site:fintech.com.au" for recent coverage in the last 12 months.',
      reasoning: "AU trade and national press for funding, leadership, and strategic moves.",
    },
  ];
}

function buildNzSources(enterprise: boolean): SourceTemplate[] {
  return [
    websiteSource(),
    {
      name: "NZ Companies Office",
      searchHint: 'Search "site:companiesoffice.govt.nz [company name]" for company details and directors.',
      reasoning: "Official NZ registry for entity status and director information.",
    },
    {
      name: "NZ job postings",
      searchHint: 'Search "[company name] jobs site:seek.co.nz OR site:linkedin.com/jobs" — read descriptions for operational challenges.',
      reasoning: "Hiring signals reveal where the business is investing and where it is constrained.",
    },
    linkedInLeadershipSource(enterprise),
    {
      name: "NZ business press",
      searchHint: 'Search "[company name] site:nzherald.co.nz OR site:interest.co.nz OR site:stuff.co.nz/business" for recent coverage.',
      reasoning: "Local business press for NZ market context and recent triggers.",
    },
  ];
}

function buildUsSources(text: string, enterprise: boolean): SourceTemplate[] {
  const financial = isFinancialServices(text);
  const sources: SourceTemplate[] = [
    websiteSource(),
    {
      name: enterprise ? "SEC EDGAR filings" : "State business registry",
      searchHint: enterprise
        ? 'Search "site:sec.gov [company name] 10-K OR 10-Q OR 8-K" for recent filings and risk factors.'
        : 'Search "[company name] secretary of state business registration" for entity details.',
      reasoning: enterprise
        ? "Public filings and risk factors for enterprise financial and regulated targets."
        : "Confirms entity status for SMB and mid-market private companies.",
    },
    {
      name: "US job postings",
      searchHint: 'Search "[company name] jobs site:linkedin.com/jobs OR site:indeed.com" — read descriptions for hiring priorities.',
      reasoning: "Job postings surface operational pain and growth priorities quickly.",
    },
    linkedInLeadershipSource(enterprise),
    {
      name: financial ? "US financial press" : "US business press",
      searchHint: financial
        ? 'Search "[company name] site:wsj.com OR site:bloomberg.com OR site:americanbanker.com" for recent coverage.'
        : 'Search "[company name] site:techcrunch.com OR site:forbes.com OR site:businessinsider.com" for recent coverage.',
      reasoning: "National and trade press for strategic moves, funding, and leadership changes.",
    },
  ];
  return sources;
}

function buildGlobalSources(enterprise: boolean): SourceTemplate[] {
  return [
    websiteSource(),
    {
      name: "Official business registry",
      searchHint: 'Search "[company name] companies registry OR business registration" in the target company\'s home country.',
      reasoning: "Confirms legal entity, directors, and filing activity in the target market.",
    },
    {
      name: "Job postings",
      searchHint: 'Search "[company name] jobs site:linkedin.com/jobs" — read descriptions for hiring priorities and pain signals.',
      reasoning: "Hiring is the most reliable cross-market signal for operational challenges.",
    },
    linkedInLeadershipSource(enterprise),
    {
      name: "Industry press",
      searchHint: 'Search "[company name] news OR press release" limited to the last 12 months, prioritising trade publications in their sector.',
      reasoning: "Recent coverage surfaces triggers, leadership moves, and strategic bets.",
    },
  ];
}

function buildSourcesForProfile(yourCompany: YourCompanyInput): SourceTemplate[] {
  const region = detectPrimaryRegion(yourCompany.geographies);
  const text = profileText(yourCompany);
  const enterprise = isEnterprise(yourCompany.dealSize);
  const smb = isSmb(yourCompany.dealSize);

  let sources: SourceTemplate[];
  switch (region) {
    case "uk":
      sources = buildUkSources(text, enterprise);
      break;
    case "au":
      sources = buildAuSources(enterprise);
      break;
    case "nz":
      sources = buildNzSources(enterprise);
      break;
    case "us":
      sources = buildUsSources(text, enterprise);
      break;
    default:
      sources = buildGlobalSources(enterprise);
  }

  if (smb && sources.length > 6) {
    sources = sources.slice(0, 5);
  }

  return sources.slice(0, 7);
}

function sellerContextLine(yourCompany: YourCompanyInput): string {
  const geographies = yourCompany.geographies?.join(", ") ?? "your markets";
  const industry = yourCompany.industryServed ?? yourCompany.whoYouSellTo ?? "your target industry";
  const motion = yourCompany.dealSize ?? "mid-market";
  const product = yourCompany.oneLineDescription ?? yourCompany.whatYouSell ?? "your product";

  return `Seller context: you are researching target accounts for a ${motion} seller offering ${product} into ${industry} across ${geographies}. Prioritise sources and signals relevant to that motion.`;
}

export function buildResearchSourceInstructions(yourCompany?: YourCompanyInput): string {
  if (!yourCompany?.geographies?.length) {
    return DEFAULT_AU_SOURCE_BLOCK;
  }

  const sources = buildSourcesForProfile(yourCompany);
  const lines = sources.map((source, index) => (
    `SOURCE ${index + 1} — ${source.name}: ${source.searchHint}\nWhy this source: ${source.reasoning}`
  ));

  return `${sellerContextLine(yourCompany)}

When given a company URL, search across these HIGH-PRIORITY sources only — do not spend time on other sources:

${lines.join("\n\n")}`;
}

export function countConfiguredSources(yourCompany?: YourCompanyInput): number {
  if (!yourCompany?.geographies?.length) return 5;
  return buildSourcesForProfile(yourCompany).length;
}

export { DEFAULT_AU_SOURCE_BLOCK };
