import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a world-class GTM (Go-To-Market) research analyst. 
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
    "reason": "One clear sentence explaining the fit score."
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

Be specific, not generic. Use real facts from your web search. The ICP fit score should be between 1-10 where 10 is a perfect fit for a GTM intelligence and competitive strategy product used by sales and marketing teams. If you cannot find specific information, make an educated inference based on what you do find but keep it grounded.`;

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

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    tools: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: "web_search_20250305", name: "web_search" } as any,
    ],
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Research this company and generate a structured account brief: ${parsedUrl.href}

Search for:
1. What the company does, their size, location, industry, and funding history
2. Their leadership team and likely buying committee personas
3. Recent news, product launches, funding announcements, hiring trends, or other trigger events from the last 6 months
4. Any signals about their challenges or pain points

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
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  let brief: unknown;
  try {
    brief = JSON.parse(jsonText);
  } catch {
    req.log.error({ raw: jsonText.slice(0, 500) }, "Failed to parse Claude response as JSON");
    res.status(500).json({ error: "Failed to parse AI response. Please try again." });
    return;
  }

  res.json(brief);
});

export default router;
