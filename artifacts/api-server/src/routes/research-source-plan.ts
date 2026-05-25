import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { PlanResearchSourcesResponse } from "@workspace/api-zod";
import { yourCompanyHasContext, type YourCompanyInput } from "../lib/brief-ai";
import { planResearchSources } from "../lib/research-source-plan";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

router.post("/research-source-plan", async (req, res): Promise<void> => {
  const { yourCompany } = req.body as { yourCompany?: YourCompanyInput };

  if (!yourCompanyHasContext(yourCompany)) {
    res.status(400).json({
      error: "Complete Your Company setup before generating a research source plan.",
    });
    return;
  }

  req.log.info({ companyName: yourCompany!.companyName }, "Planning research sources");

  try {
    const plan = await planResearchSources(client, yourCompany!);
    res.json(PlanResearchSourcesResponse.parse({ plan }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Source planning failed";
    req.log.error({ err }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
