import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildYourCompanyContext,
  callClaudeJsonWithSearch,
  type YourCompanyInput,
} from "../lib/brief-ai";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

router.post("/market-prospect", async (req, res): Promise<void> => {
  const { description, yourCompany } = req.body as {
    description?: string;
    yourCompany?: YourCompanyInput;
  };

  if (!description || typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  req.log.info({ description: description.slice(0, 80) }, "Market prospecting");

  const system = `You are a GTM prospecting analyst specialising in Australian B2B markets.

Search the web to find 8-10 REAL companies that match the user's target market description. Focus on Australia unless the description specifies otherwise.

Return ONLY valid JSON:
{
  "companies": [
    {
      "name": "Company Name",
      "domain": "company.com.au",
      "reason": "One sentence on why they fit the market description",
      "estimatedSize": "e.g. 50-200 employees or Unknown"
    }
  ]
}

Rules:
- Prefer companies with verifiable websites — no made-up names.
- Include a mix of well-known and mid-market if possible.
- If you cannot find 8, return as many real matches as you found (minimum 3).
- Domains must be real — use web search to verify.${buildYourCompanyContext(yourCompany)}`;

  try {
    const result = await callClaudeJsonWithSearch(
      client,
      system,
      `Find matching prospect companies for this target market:\n"${description.trim()}"\n\nSearch now and return ONLY the JSON object.`,
      2500,
      50000,
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
