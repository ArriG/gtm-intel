import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { icpsTable } from "@workspace/db/schema";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Builds the ICP scoring context from saved ICPs
// If no ICPs exist, falls back to a sensible generic description
function buildIcpScoringContext(icps: typeof icpsTable.$inferSelect[]): string {
  if (!icps || icps.length === 0) {
    return `Score ICP fit from 1-10 where 10 is a perfect fit for a GTM intelligence platform used by B2B SaaS sales and marketing teams. Use general best-practice ICP criteria.`;
  }

  const descriptions = icps.map((icp, i) => {
    // Fields are stored as JSON strings in the DB — parse them safely
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

const BASE_SYSTEM_PROMPT = `You are a world-class GTM (Go-To-Market) research analyst. 
When given a company URL, you will use web search to research the company thoroughly and return a structured account brief in JSON format.
Always respond with ONLY valid JSON matching this exact structure:
{
  "companySnapshot": {
    "size": "e.g. 200-500 employees",
    "industry": "e.g. B2B SaaS / HR Tech",
    "location": "e.g. San Francisco, CA",
    "fundingStage": "e.g. Series B ($45M raised)"
  },
  "icpFitScore": {
    "score": 8,
    "reason": "One clear sentence explaining the fit score and which ICP they best match."
  },
  "buyingCommittee": [
    { "title": "VP of Sales", "painPoint": "Specific pain point for this persona at this company." },
    { "title": "Head of Revenue Operations", "painPoint": "Specific pain point for this persona." },
    { "title": "CEO / Founder", "painPoint": "Specific pain point for this persona." }
  ],
  "topPainPoints": [
    "First specific pain point this company likely faces.",
    "Second specific pain point.",
    "Third specific pain point."
  ],
  "recentNews": [
    "Recent event or trigger worth mentioning in outreach.",
    "Another recent event or signal.",
    "Another relevant trigger event if available."
  ],
  "suggestedOpeningLine": "A compelling, personalized first sentence for a cold email that references something specific about this company."
}
Be specific, not generic. Use real facts from your web search. If you cannot find specific information, make an educated inference based on what you do find but keep it grounded.`;

router.post("/account-brief", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };

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

  // Fetch saved ICPs from the database
  // If this fails for any reason, we fall back to generic scoring gracefully
  let icpContext = "";
  try {
    const icps = await db.select().from(icpsTable);
    icpContext = buildIcpScoringContext(icps);
    req.log.info({ icpCount: icps.length }, "Loaded ICPs for scoring context");
  } catch (err) {
    req.log.warn({ err }, "Could not load ICPs — falling back to generic scoring");
    icpContext = buildIcpScoringContext([]);
  }

  // Build the full system prompt with dynamic ICP context injected
  const systemPrompt = `${BASE_SYSTEM_PROMPT}

ICP SCORING INSTRUCTIONS:
${icpContext}`;

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
          content: `Research this company and generate a structured account brief: ${parsedUrl.href}

Search for:
1. What the company does, their size, location, industry, and funding history
2. Their leadership team and likely buying committee personas
3. Recent news, product launches, funding announcements, hiring trends, or other trigger events from the last 6 months
4. Any signals about their challenges or pain points

Score their ICP fit using the specific ICP criteria provided in your instructions.

Return ONLY the JSON object. No markdown, no explanation.`,
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
