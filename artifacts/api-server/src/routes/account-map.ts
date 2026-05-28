import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildYourCompanyContext,
  callClaudeJsonWithSearch,
  parseJsonFromResponse,
  textFromMessageContent,
  yourCompanyHasContext,
  type YourCompanyInput,
} from "../lib/brief-ai";
import { normalizeAccountMap } from "../lib/account-map-normalize";
import { ACCOUNT_MAP_RESPONSE_FORMAT } from "../prompts/account-map-response-format";
import { loadConstitution, loadPackByName } from "../prompts/pack-loader";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAPPING_PACK_ID = "european-financial-services";
const MAPPING_TIMEOUT_MS = 150_000;

function composeAccountMapPrompt(yourCompany: YourCompanyInput): { systemPrompt: string; sectorPackUsed: string } {
  const constitution = loadConstitution();
  const pack = loadPackByName(MAPPING_PACK_ID);

  if (!pack) {
    throw new Error(`Sector pack "${MAPPING_PACK_ID}" not found`);
  }

  const sourceBlock = `${pack.body}

When mapping a global enterprise, follow the European Financial Services sector pack above for European entities. Use public web search for non-European regions with the same verification standard — omit buyers without verifiable URLs.`;

  const systemPrompt = [
    "You are a world-class enterprise research analyst producing factual account maps.",
    "",
    constitution,
    "",
    sourceBlock,
    buildYourCompanyContext(yourCompany),
    "",
    "SPEED INSTRUCTION: Complete mapping within 120 seconds using at most 7 web searches total. Move on if a source returns nothing useful after one attempt.",
    ACCOUNT_MAP_RESPONSE_FORMAT,
  ].filter(Boolean).join("\n\n");

  return {
    systemPrompt,
    sectorPackUsed: MAPPING_PACK_ID,
  };
}

router.post("/account-map", async (req, res): Promise<void> => {
  const { company, yourCompany } = req.body as {
    company?: string;
    yourCompany?: YourCompanyInput;
  };

  const companyName = company?.trim();
  if (!companyName) {
    res.status(400).json({ error: "company is required" });
    return;
  }

  if (!yourCompanyHasContext(yourCompany)) {
    res.status(400).json({ error: "yourCompany is required" });
    return;
  }

  req.log.info({ company: companyName }, "Generating account map");

  let composed: { systemPrompt: string; sectorPackUsed: string };
  try {
    composed = composeAccountMapPrompt(yourCompany!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load mapping sector pack";
    req.log.error({ err }, message);
    res.status(500).json({ error: message });
    return;
  }

  const generatedAt = new Date().toISOString();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Mapping timed out — please try again")), MAPPING_TIMEOUT_MS),
  );

  try {
    const message = await Promise.race([
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 6000,
        tools: [{ type: "web_search_20250305", name: "web_search" } as any],
        system: composed.systemPrompt,
        messages: [{
          role: "user",
          content: `Map the global enterprise structure for: ${companyName}

Organise operating entities by geographic region. Return ONLY the JSON object — no other text.`,
        }],
      }),
      timeoutPromise,
    ]) as Anthropic.Message;

    const responseText = textFromMessageContent(message.content);
    if (!responseText) {
      res.status(500).json({ error: "No response generated. Please try again." });
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonFromResponse(responseText) as Record<string, unknown>;
    } catch (err) {
      req.log.error({ raw: responseText.slice(0, 500), err }, "Failed to parse account map JSON");
      res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      return;
    }

    const normalized = normalizeAccountMap(parsed, generatedAt, composed.sectorPackUsed);
    res.json(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err, company: companyName }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
