import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { icpsTable } from "@workspace/db/schema";
import {
  buildEmailToneInstruction,
  buildIcpScoringContext,
  buildLinkedinContext,
  buildOwnIntelContext,
  buildYourCompanyContext,
  callClaudeJson,
  callClaudeJsonWithSearch,
  parseJsonFromResponse,
  type EmailTone,
  type YourCompanyInput,
} from "../lib/brief-ai";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BASE_SYSTEM_PROMPT = `You are a world-class GTM research analyst specialising in Australian and Asia-Pacific markets.

When given a company URL, search across these 5 HIGH-PRIORITY sources only — do not spend time on other sources:

SOURCE 1 — Company website and blog: Read their homepage, about page, and any recent blog posts.

SOURCE 2 — Australian business registry: Search "site:abr.business.gov.au [company name]" for ABN details. Search "[company name] ASIC" for any regulatory filings or director information.

SOURCE 3 — Job postings: Search "[company name] jobs site:seek.com.au" — read job descriptions carefully. What roles are they hiring for? What does the job description reveal about their operational challenges? This is your highest-signal source for pain points.

SOURCE 4 — LinkedIn leadership signals: Search "site:linkedin.com [CEO name] [company name]" and "site:linkedin.com [CFO name] [company name]" for any recent public posts from their C-suite. Note exact quotes if found.

SOURCE 5 — Australian press: Search "[company name] site:afr.com OR site:smartcompany.com.au OR site:fintech.com.au" for recent coverage in the last 12 months.

SPEED INSTRUCTION: Complete all searches and return your response within 45 seconds. If a source returns nothing useful after one search attempt, move on immediately — do not retry.

For each source that produces useful information, record it in the sources arrays using these types: "web", "abn", "asic", "seek_job", "linkedin", "industry_press", "assumed".
Confidence levels: "verified" = direct quote or official filing, "informed" = strong contextual signal, "assumed" = educated inference.

RESPONSE FORMAT — return ONLY valid JSON, no markdown, no preamble:

{
  "companySnapshot": {
    "size": "e.g. 50-200 employees",
    "industry": "e.g. Financial Services / Mortgage Broking",
    "location": "e.g. Sydney, NSW, Australia",
    "fundingStage": "e.g. Series A or Bootstrapped or Unknown",
    "abn": "e.g. 12 345 678 901 or Not found",
    "techStack": "e.g. Salesforce, Xero or Not detected",
    "sources": [
      { "type": "web", "label": "Company website", "detail": "Key facts found", "url": "", "confidence": "verified" }
    ]
  },
  "icpFitScore": {
    "score": 7,
    "reason": "One sentence explaining the score and which ICP they match.",
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
    "narrative": "Write 2-3 sentences as a senior AE preparing for a first call. Describe what is going on in their world right now — what pressures they are under, what they are trying to achieve, and what would make them pick up the phone today. Reference specific findings. Present tense, conversational but professional.",
    "confidence": "medium",
    "sources": [
      { "type": "seek_job", "label": "Seek job posting", "detail": "Specific operational signal", "url": "", "confidence": "informed" },
      { "type": "industry_press", "label": "AFR article", "detail": "Market context", "url": "", "confidence": "verified" }
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
- The theirWorld narrative must read like a human AE wrote it — a story, not a list.
- The fullEmail must reference at least one specific signal from your research.
- Keep the entire JSON response concise — aim for quality over length.
- Always include all 6 top-level keys even if some sections have limited data.`;

function buildActionContext(
  linkedinPosts?: Array<{ role: string; content: string }>,
  ownIntel?: string,
  yourCompany?: YourCompanyInput,
) {
  return `${buildYourCompanyContext(yourCompany)}${buildOwnIntelContext(ownIntel)}${buildLinkedinContext(linkedinPosts)}`;
}

router.post("/account-brief", async (req, res): Promise<void> => {
  const { url, linkedinPosts, ownIntel, yourCompany, emailTone } = req.body as {
    url?: string;
    linkedinPosts?: Array<{ role: string; content: string }>;
    ownIntel?: string;
    yourCompany?: YourCompanyInput;
    emailTone?: EmailTone;
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

  const userContext = {
    hasLinkedIn: !!(linkedinPosts && linkedinPosts.length > 0),
    hasOwnIntel: !!(ownIntel && ownIntel.trim()),
    hasYourCompany: !!(yourCompany && Object.values(yourCompany).some(v => v?.trim())),
  };

  let icpContext = "";
  try {
    const icps = await db.select().from(icpsTable);
    icpContext = buildIcpScoringContext(icps, userContext);
  } catch (err) {
    req.log.warn({ err }, "Could not load ICPs — falling back to generic scoring");
    icpContext = buildIcpScoringContext([], userContext);
  }

  const tone = emailTone || "direct";
  const systemPrompt = `${BASE_SYSTEM_PROMPT}

ICP SCORING INSTRUCTIONS:
${icpContext}${buildActionContext(linkedinPosts, ownIntel, yourCompany)}${buildEmailToneInstruction(tone)}`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Research timed out — please try again")), 55000),
  );

  try {
    const message = await Promise.race([
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" } as any],
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Research this company across the 5 priority sources and generate a complete account brief: ${parsedUrl.href}

Work through the sources in order:
1. Company website
2. ABN/ASIC lookup
3. Seek job postings
4. LinkedIn C-suite posts
5. Australian press (AFR, SmartCompany)

Stop each search after one attempt if nothing useful is returned. Return the JSON as soon as all 5 searches are complete.

Return ONLY the JSON object. No markdown, no explanation.`,
        }],
      }),
      timeoutPromise,
    ]) as Anthropic.Message;

    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      res.status(500).json({ error: "No response generated. Please try again." });
      return;
    }

    let brief: unknown;
    try {
      brief = parseJsonFromResponse(textBlock.text);
    } catch {
      req.log.error({ raw: textBlock.text.slice(0, 500) }, "Failed to parse Claude response as JSON");
      res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      return;
    }

    res.json(brief);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err }, message);
    res.status(500).json({ error: message });
  }
});

router.post("/account-brief/cold-email", async (req, res): Promise<void> => {
  const { companyName, brief, emailTone, linkedinPosts, ownIntel, yourCompany } = req.body as {
    companyName?: string;
    brief?: Record<string, unknown>;
    emailTone?: EmailTone;
    linkedinPosts?: Array<{ role: string; content: string }>;
    ownIntel?: string;
    yourCompany?: YourCompanyInput;
  };

  if (!companyName || !brief) {
    res.status(400).json({ error: "companyName and brief are required" });
    return;
  }

  const tone = emailTone || "direct";
  const system = `You are a senior B2B AE writing cold outreach. Return ONLY valid JSON with this shape:
{ "opener": "...", "fullEmail": "Subject: ...\\n\\nHi [First name],\\n\\n...", "sources": [{ "type": "...", "label": "...", "detail": "...", "url": "", "confidence": "..." }] }
Reference specific signals from the brief. Value outcomes, not features.${buildActionContext(linkedinPosts, ownIntel, yourCompany)}${buildEmailToneInstruction(tone)}`;

  try {
    const result = await callClaudeJson(
      client,
      system,
      `Write a cold email for ${companyName} using this research brief:\n${JSON.stringify(brief, null, 2)}\n\nReturn ONLY the JSON object.`,
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err }, message);
    res.status(500).json({ error: message });
  }
});

router.post("/account-brief/talk-track", async (req, res): Promise<void> => {
  const { companyName, brief, linkedinPosts, ownIntel, yourCompany } = req.body as {
    companyName?: string;
    brief?: Record<string, unknown>;
    linkedinPosts?: Array<{ role: string; content: string }>;
    ownIntel?: string;
    yourCompany?: YourCompanyInput;
  };

  if (!companyName || !brief) {
    res.status(400).json({ error: "companyName and brief are required" });
    return;
  }

  const system = `You are a senior AE preparing for a discovery call. Return ONLY valid JSON:
{
  "opening": "2-3 sentence call opener referencing a specific signal from the brief",
  "discoveryQuestions": ["5-7 open-ended discovery questions tailored to their pains and our solution"]
}
Questions must reference specific findings — job postings, triggers, or committee pain points. Bridge to what we sell.${buildActionContext(linkedinPosts, ownIntel, yourCompany)}`;

  try {
    const result = await callClaudeJson(
      client,
      system,
      `Generate a discovery call talk track for ${companyName}.\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nReturn ONLY the JSON object.`,
      2000,
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
