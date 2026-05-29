import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildYourCompanyContext,
  parseJsonFromResponse,
  textFromMessageContent,
  yourCompanyHasContext,
  type YourCompanyInput,
} from "../lib/brief-ai";
import {
  LEADERSHIP_ENRICH_CAP,
  mergeLeadershipOntoStructure,
  selectEntitiesForLeadership,
} from "../lib/account-map-merge";
import { normalizeAccountMap } from "../lib/account-map-normalize";
import { ACCOUNT_MAP_PEOPLE_FORMAT } from "../prompts/account-map-people-format";
import { ACCOUNT_MAP_STRUCTURE_FORMAT } from "../prompts/account-map-structure-format";
import { loadConstitution, loadPackByName } from "../prompts/pack-loader";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAPPING_PACK_ID = "european-financial-services";
const MAPPING_MODEL = "claude-haiku-4-5-20251001";
/** Flip to Sonnet when ready — Pass 2 leadership enrichment only */
const PASS_2_MODEL = MAPPING_MODEL;

const MAPPING_TIMEOUT_MS = 150_000;
const PASS_1_MAX_TOKENS = 8000;
const PASS_2_MAX_TOKENS = 4000;

function composeStructurePrompt(yourCompany: YourCompanyInput): { systemPrompt: string; sectorPackUsed: string } {
  const constitution = loadConstitution();
  const pack = loadPackByName(MAPPING_PACK_ID);

  if (!pack) {
    throw new Error(`Sector pack "${MAPPING_PACK_ID}" not found`);
  }

  const sourceBlock = `${pack.body}

When mapping a global enterprise, follow the European Financial Services sector pack above for European entities. Use public web search for non-European regions with the same verification standard.`;

  const systemPrompt = [
    "You are a world-class enterprise research analyst producing factual account maps.",
    "",
    constitution,
    "",
    sourceBlock,
    buildYourCompanyContext(yourCompany),
    "",
    "PASS 1 — STRUCTURE ONLY: Do not search for named executives. Return buyers: [] on every entity.",
    "SPEED INSTRUCTION: Complete this structure pass within 90 seconds using at most 10 web searches. Prioritise subsidiary discovery and group context.",
    ACCOUNT_MAP_STRUCTURE_FORMAT,
  ].filter(Boolean).join("\n\n");

  return {
    systemPrompt,
    sectorPackUsed: MAPPING_PACK_ID,
  };
}

function composePeoplePrompt(yourCompany: YourCompanyInput): string {
  const pack = loadPackByName(MAPPING_PACK_ID);
  const leadershipBlock = pack
    ? `Apply the sector pack leadership guidance and role aliases below.\n\n${pack.body}`
    : "";

  return [
    "You are a specialist in verifying named insurance and financial services executives from public sources.",
    leadershipBlock,
    buildYourCompanyContext(yourCompany),
    "",
    "PASS 2 — LEADERSHIP ONLY: Find named, sourced executives per entity. Never invent names.",
    "SPEED INSTRUCTION: Complete within 60 seconds using at most 8 web searches across all entities in this batch.",
    ACCOUNT_MAP_PEOPLE_FORMAT,
  ].filter(Boolean).join("\n\n");
}

async function callMappingPass(
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number,
  remainingMs: number,
): Promise<Record<string, unknown>> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Mapping timed out — please try again")), remainingMs),
  );

  const message = await Promise.race([
    client.messages.create({
      model,
      max_tokens: maxTokens,
      tools: [{ type: "web_search_20250305", name: "web_search" } as any],
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
    timeoutPromise,
  ]) as Anthropic.Message;

  const responseText = textFromMessageContent(message.content);
  if (!responseText) {
    throw new Error("No response generated. Please try again.");
  }

  return parseJsonFromResponse(responseText) as Record<string, unknown>;
}

function buildPeopleUserMessage(
  companyName: string,
  targets: Array<Record<string, unknown>>,
): string {
  const entityLines = targets.map((e, i) => {
    const parts = [
      `${i + 1}. ${e.name}`,
      `   Country: ${e.country}`,
      `   Region: ${e.region}`,
      `   Business line: ${e.businessLine}`,
      `   Fit: ${e.fitTier}`,
    ];
    if (e.context) parts.push(`   Context: ${e.context}`);
    return parts.join("\n");
  });

  return `Parent group: ${companyName}

Find named leadership for ONLY these ${targets.length} operating entities (return the same names exactly):

${entityLines.join("\n\n")}

Return ONLY the JSON object — no other text.`;
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

  req.log.info({ company: companyName }, "Generating account map (two-pass)");

  let composed: { systemPrompt: string; sectorPackUsed: string };
  try {
    composed = composeStructurePrompt(yourCompany!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load mapping sector pack";
    req.log.error({ err }, message);
    res.status(500).json({ error: message });
    return;
  }

  const generatedAt = new Date().toISOString();
  const deadline = Date.now() + MAPPING_TIMEOUT_MS;

  try {
    const structureRaw = await callMappingPass(
      MAPPING_MODEL,
      composed.systemPrompt,
      `Map the global enterprise structure for: ${companyName}

Organise operating entities by geographic region. Do NOT return named executives — buyers must be [] on every entity.
Return ONLY the JSON object — no other text.`,
      PASS_1_MAX_TOKENS,
      deadline - Date.now(),
    );

    const rawEntities = Array.isArray(structureRaw.entities)
      ? structureRaw.entities as Array<Record<string, unknown>>
      : [];

    const enrichTargets = selectEntitiesForLeadership(rawEntities, LEADERSHIP_ENRICH_CAP);
    let merged = structureRaw;

    if (enrichTargets.length > 0) {
      const remainingMs = deadline - Date.now();
      if (remainingMs > 15_000) {
        try {
          const peopleRaw = await callMappingPass(
            PASS_2_MODEL,
            composePeoplePrompt(yourCompany!),
            buildPeopleUserMessage(companyName, enrichTargets),
            PASS_2_MAX_TOKENS,
            remainingMs,
          );
          merged = mergeLeadershipOntoStructure(structureRaw, peopleRaw);
          req.log.info(
            { company: companyName, enriched: enrichTargets.length },
            "Account map pass 2 leadership merge complete",
          );
        } catch (pass2Err) {
          req.log.warn(
            { err: pass2Err, company: companyName },
            "Pass 2 leadership enrichment failed — returning structure-only map",
          );
        }
      } else {
        req.log.warn({ company: companyName }, "Skipping pass 2 — insufficient time remaining");
      }
    }

    const normalized = normalizeAccountMap(merged, generatedAt, composed.sectorPackUsed);
    res.json(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err, company: companyName }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
