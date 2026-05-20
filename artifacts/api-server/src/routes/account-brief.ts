import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { icpsTable } from "@workspace/db/schema";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildIcpScoringContext(icps: typeof icpsTable.$inferSelect[]): string {
  if (!icps || icps.length === 0) {
    return `Score ICP fit from 1-10 where 10 is a perfect fit for a GTM intelligence platform used by B2B SaaS sales and marketing teams. Use general best-practice ICP criteria.`;
  }

  const descriptions = icps.map((icp, i) => {
    const safeparse = (val: string, fallback: string[] = []) => {
      try { return JSON.parse(val) as string[]; } catch { return fallback; }
    };
    const jobTitles = safeparse(icp.jobTitles);
    const painPoints = safeparse(icp.painPoints);
    const goals = safeparse(icp.goals);
    const channels = safeparse(icp.channels);

    return [
      `ICP ${i + 1}: "${icp.name}"`,
      `  Industry: ${icp.industry}`,
      `  Company size: ${icp.companySize}`,
      jobTitles.length ? `  Key roles: ${jobTitles.join(", ")}` : null,
      painPoints.length ? `  Pain points: ${painPoints.join("; ")}` : null,
      goals.length ? `  Goals: ${goals.join("; ")}` : null,
      channels.length ? `  Preferred channels: ${channels.join(", ")}` : null,
      icp.notes ? `  Notes: ${icp.notes}` : null,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  return `Score ICP fit from 1-10 based specifically on how well this company matches the ICP definitions below.
A score of 10 means near-perfect alignment with at least one ICP.
In your reason, name which ICP they best match and why.
If they match none well, explain what's misaligned.

DEFINED ICPs:
${descriptions}`;
}

const BASE_SYSTEM_PROMPT = `You are a world-class GTM (Go-To-Market) research analyst and sales intelligence expert specialising in Australian and Asia-Pacific markets.

When given a company URL, use web search to research the company thoroughly across MULTIPLE SOURCE TYPES and return a structured account brief in JSON format.

CRITICAL SEARCH INSTRUCTIONS — search ALL of these for every company:
1. Company website, about page, blog, and press releases
2. Australian-specific: Search "site:asic.gov.au [company name]" for ASIC filings, then "abr.business.gov.au [company name]" for ABN/business registration details
3. Job postings: Search "[company name] jobs site:seek.com.au" AND "[company name] site:linkedin.com/jobs" — read job descriptions carefully for operational pain signals
4. LinkedIn leadership: Search "site:linkedin.com/in [CEO/CFO/COO name] [company name]" for recent public posts from their C-suite
5. Funding and investment: Search "[company name] site:crunchbase.com" AND "[company name] funding raised investment"
6. Industry press: Search "[company name] site:afr.com OR site:smh.com.au OR site:smartcompany.com.au OR site:fintech.com.au" for recent coverage
7. For finance companies: Search "[company name] site:mfaa.com.au OR site:fbaa.com.au OR ASIC responsible lending"
8. Tech stack: Search "[company name] site:builtwith.com OR site:stackshare.io" for technology signals
9. Reviews: Search "[company name] site:g2.com OR site:capterra.com" for product/vendor reviews they've left
10. Earnings/annual reports: Search "[company name] annual report OR ASX announcement OR earnings call transcript"

For EVERY source you find, record:
- The source type (web, linkedin, asic, abn, seek_job, crunchbase, industry_press, builtwith, g2, asx_filing, mfaa, assumed)
- A brief label describing what you found
- The specific detail or quote that informed the insight
- The URL if available
- Confidence level: "verified" (direct quote/filing), "informed" (strong contextual signal), or "assumed" (educated inference)

RESPONSE FORMAT — return ONLY valid JSON matching this EXACT structure:

{
  "companySnapshot": {
    "size": "e.g. 200-500 employees",
    "industry": "e.g. Financial Services / Mortgage Broking",
    "location": "e.g. Sydney, NSW, Australia",
    "fundingStage": "e.g. Series A ($12M raised, 2023)",
    "abn": "e.g. 12 345 678 901 or Not found",
    "techStack": "e.g. Salesforce CRM, Xero, Microsoft 365 or Not detected",
    "sources": [
      { "type": "web", "label": "Company website", "detail": "What you found", "url": "https://...", "confidence": "verified" },
      { "type": "abn", "label": "ABN Lookup", "detail": "Registered as...", "url": "https://abr.business.gov.au/...", "confidence": "verified" }
    ]
  },
  "icpFitScore": {
    "score": 8,
    "reason": "One clear sentence explaining the fit score and which ICP they best match.",
    "sources": [
      { "type": "web", "label": "Source label", "detail": "What informed this score", "url": "", "confidence": "informed" }
    ]
  },
  "buyingCommittee": [
    {
      "title": "CFO",
      "painPoint": "Specific verified or informed pain point for this persona.",
      "linkedinSignal": "Quote or summary from their LinkedIn post if found, otherwise empty string",
      "sources": [
        { "type": "linkedin", "label": "LinkedIn post", "detail": "They posted about...", "url": "", "confidence": "verified" }
      ]
    }
  ],
  "theirWorld": {
    "narrative": "2-3 paragraph narrative written as if you are a senior AE preparing for a first call. Describe what is going on in their world right now — what pressures they are under, what they are trying to achieve, what is probably broken, and what would make them pick up the phone today. Reference specific findings from your research. Write in present tense, conversational but professional.",
    "confidence": "high",
    "sources": [
      { "type": "seek_job", "label": "Seek job posting", "detail": "Specific signal from the job ad", "url": "https://seek.com.au/...", "confidence": "informed" },
      { "type": "industry_press", "label": "AFR article", "detail": "What the article said", "url": "https://afr.com/...", "confidence": "verified" },
      { "type": "assumed", "label": "Inferred from company stage", "detail": "Reasoning behind inference", "url": "", "confidence": "assumed" }
    ]
  },
  "recentTriggers": {
    "items": [
      { "event": "Specific trigger event description", "significance": "Why this matters for outreach", "recency": "e.g. 3 weeks ago" }
    ],
    "sources": [
      { "type": "web", "label": "Source label", "detail": "What you found", "url": "", "confidence": "verified" }
    ]
  },
  "coldEmail": {
    "opener": "A compelling personalised first sentence referencing something specific and verified.",
    "fullEmail": "Subject: [subject line]\\n\\nHi [First name],\\n\\n[Opening line referencing a specific verified signal — news, job posting, LinkedIn post, or trigger event]\\n\\n[Value statement — what you do and the specific outcome relevant to their situation, not features]\\n\\n[One specific proof point or relevant outcome]\\n\\nWorth a 15-minute call to see if it fits how your team works?\\n\\n[Your name]",
    "sources": [
      { "type": "seek_job", "label": "Job posting used for personalisation", "detail": "Specific signal used", "url": "", "confidence": "informed" }
    ]
  },
  "sourceSummary": {
    "totalSources": 8,
    "sourceTypes": ["web", "abn", "seek_job", "industry_press", "linkedin"],
    "australianSources": 3,
    "overallConfidence": "high",
    "confidenceReason": "Brief is based on 3 verified sources including ASIC filing and live job postings. Two signals are inferred from company stage."
  }
}

IMPORTANT RULES:
- Be specific, not generic. Use real facts from your searches.
- When you cannot find specific information, use type "assumed" and explain your reasoning clearly.
- The theirWorld narrative should read like an experienced AE wrote it — not a list, a story.
- The fullEmail must use the person's own language or specific signals where possible.
- Always include sourceSummary — it tells the AE how much to trust this brief.
- For Australian companies always attempt ABN lookup and ASIC search first.`;

router.post("/account-brief", async (req, res): Promise<void> => {
  const { url, linkedinPosts, ownIntel } = req.body as {
    url?: string;
    linkedinPosts?: Array<{ role: string; content: string }>;
    ownIntel?: string;
  };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    res.status(400).json({ error: "Invalid URL format" });
    return;
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, "");
  req.log.info({ hostname }, "Generating account brief");

  let icpContext = "";
  try {
    const icps = await db.select().from(icpsTable);
    icpContext = buildIcpScoringContext(icps);
    req.log.info({ icpCount: icps.length }, "Loaded ICPs for scoring context");
  } catch (err) {
    req.log.warn({ err }, "Could not load ICPs — falling back to generic scoring");
    icpContext = buildIcpScoringContext([]);
  }

  // Build optional context blocks
  const linkedinContext = linkedinPosts && linkedinPosts.length > 0
    ? `\n\nLINKEDIN CONTEXT PROVIDED BY THE AE (treat as PRIMARY EVIDENCE — verified signals from decision makers):\n${linkedinPosts.map(p => `${p.role}: "${p.content}"`).join("\n\n")}\n\nIncorporate these posts directly into the theirWorld narrative and buying committee sections. Use their exact language in the cold email opener where relevant. Tag these sources as type "linkedin" with confidence "verified".`
    : "";

  const ownIntelContext = ownIntel && ownIntel.trim()
    ? `\n\nAE'S OWN INTEL (private — highest priority context, treat as ground truth):\n${ownIntel.trim()}\n\nThis information comes from direct interactions with the company. Incorporate it throughout the brief, especially in the theirWorld narrative, buying committee, and cold email. Tag these sources as type "own_intel" with confidence "verified".`
    : "";

  const systemPrompt = `${BASE_SYSTEM_PROMPT}

ICP SCORING INSTRUCTIONS:
${icpContext}${linkedinContext}${ownIntelContext}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      tools: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { type: "web_search_20250305", name: "web_search" } as any,
      ],
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Research this company thoroughly using ALL the search strategies in your instructions and generate a complete account brief: ${parsedUrl.href}

SEARCH CHECKLIST — work through each of these:
1. Company website and blog
2. ASIC Connect and ABN Lookup (Australian Business Register)
3. Job postings on Seek.com.au and LinkedIn Jobs
4. LinkedIn posts from their C-suite leadership
5. Crunchbase funding history
6. Australian press: AFR, SMH, SmartCompany, FinTech Australia
7. Industry associations: MFAA, FBAA (if finance company)
8. Tech stack via BuiltWith or StackShare
9. G2/Capterra reviews they may have left
10. ASX announcements or annual reports (if listed)

For each source you actually search and find useful information from, record it in the sources arrays.
If a source returns no useful information, omit it — only include sources that informed the brief.

Return ONLY the JSON object. No markdown, no explanation, no preamble.`,
        },
      ],
    });

    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      res.status(500).json({ error: "No response generated. Please try again." });
      return;
    }

    let jsonText = textBlock.text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();

    let brief: unknown;
    try {
      brief = JSON.parse(jsonText);
    } catch {
      req.log.error({ raw: jsonText.slice(0, 500) }, "Failed to parse Claude response as JSON");
      res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      return;
    }

    res.json(brief);

  } catch (err) {
    req.log.error({ err }, "Claude API call failed");
    res.status(500).json({ error: "AI request failed. Please try again." });
  }
});

export default router;