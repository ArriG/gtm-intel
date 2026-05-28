import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildYourCompanyContext,
  callClaudeJsonWithSearch,
  type YourCompanyInput,
} from "../lib/brief-ai";
import { handleSignalRadar } from "../lib/signal-radar-handler";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

router.post("/market-prospect", async (req, res): Promise<void> => {
  const { description, yourCompany, mode } = req.body as {
    description?: string;
    yourCompany?: YourCompanyInput;
    mode?: string;
  };

  if (mode === "signal-radar") {
    await handleSignalRadar(req, res);
    return;
  }

  if (!description || typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  req.log.info({ description: description.slice(0, 80) }, "Market prospecting");

  const system = `You are a GTM prospecting analyst specialising in Australian B2B markets.

Use public web search to find REAL companies that match the user's target market description. Sources: company websites and other publicly indexed pages. Default focus: Australian B2B unless the description specifies otherwise.

Return no more than 20 companies per run.

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
- Return a maximum of 20 companies — never exceed this limit.
- Prefer companies with verifiable websites — no made-up names.
- If you cannot find many matches, return as many real ones as you found (minimum 3 when possible).
- Domains must be real — use web search to verify.
- CRITICAL: Do not write any preamble, explanation, or markdown. Your entire response must be the raw JSON object only.${buildYourCompanyContext(yourCompany)}`;

  try {
    const result = await callClaudeJsonWithSearch(
      client,
      system,
      `Find matching prospect companies for this target market:\n"${description.trim()}"\n\nSearch the web, then respond with ONLY the JSON object — no other text.`,
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
