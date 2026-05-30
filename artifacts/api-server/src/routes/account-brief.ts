import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { icpsTable } from "@workspace/db/schema";
import {
  buildEmailToneInstruction,
  buildDealMotionInstruction,
  buildIcpScoringContext,
  buildLinkedinContext,
  buildOwnIntelContext,
  buildYourCompanyContext,
  callClaudeJson,
  callClaudeJsonWithSearch,
  parseJsonFromResponse,
  textFromMessageContent,
  yourCompanyHasContext,
  type EmailTone,
  type YourCompanyInput,
} from "../lib/brief-ai";
import { composeAccountBriefPrompt } from "../prompts/compose-system-prompt";
import { normalizeAccountBriefWithMeta, normalizeColdEmailOnly } from "../lib/brief-normalize";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildActionContext(
  linkedinPosts?: Array<{ role: string; content: string }>,
  ownIntel?: string,
  yourCompany?: YourCompanyInput,
) {
  return `${buildYourCompanyContext(yourCompany)}${buildOwnIntelContext(ownIntel)}${buildLinkedinContext(linkedinPosts)}`;
}

function briefWithoutColdEmail(brief: Record<string, unknown>): Record<string, unknown> {
  const { coldEmail: _, ...rest } = brief;
  return rest;
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
    hasYourCompany: yourCompanyHasContext(yourCompany),
  };

  let icpContext = "";
  try {
    const icps = await db.select().from(icpsTable);
    icpContext = buildIcpScoringContext(icps, userContext, yourCompany);
  } catch (err) {
    req.log.warn({ err }, "Could not load ICPs — falling back to generic scoring");
    icpContext = buildIcpScoringContext([], userContext, yourCompany);
  }

  const tone = emailTone || "direct";
  const composed = composeAccountBriefPrompt(yourCompany);
  const systemPrompt = `${composed.systemPrompt}

ICP SCORING INSTRUCTIONS:
${icpContext}${buildActionContext(linkedinPosts, ownIntel, yourCompany)}${buildDealMotionInstruction(yourCompany)}${buildEmailToneInstruction(tone)}`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Research timed out — please try again")), composed.timeoutMs),
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
          content: `Research this company across the priority sources and generate a complete account brief: ${parsedUrl.href}

Work through the sources in priority order (${composed.enabledSourceCount} sources configured).
Stop each search after one attempt if nothing useful is returned. Return the JSON as soon as all configured sources are checked.

Return ONLY the JSON object. No markdown, no explanation.`,
        }],
      }),
      timeoutPromise,
    ]) as Anthropic.Message;

    const responseText = textFromMessageContent(message.content);
    if (!responseText) {
      res.status(500).json({ error: "No response generated. Please try again." });
      return;
    }

    let brief: Record<string, unknown>;
    try {
      brief = parseJsonFromResponse(responseText) as Record<string, unknown>;
    } catch (err) {
      req.log.error({ raw: responseText.slice(0, 500), err }, "Failed to parse Claude response as JSON");
      res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      return;
    }

    const { normalized, meta } = normalizeAccountBriefWithMeta(brief);

    if (meta.derivedOpener) {
      req.log.info({ hostname }, "Derived cold email opener after model omitted it");
    }
    if (meta.derivedCallDecision) {
      req.log.info({ hostname }, "Derived call decision after model omitted it");
    }

    res.json({
      ...normalized,
      researchPack: composed.researchPack,
    });
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

Write a completely NEW email — do not reuse sentences from any previous draft. The ${tone.toUpperCase()} tone must be obvious from greeting, sentence structure, and sign-off.
Reference specific signals from the research brief. Value outcomes, not features.${buildActionContext(linkedinPosts, ownIntel, yourCompany)}${buildEmailToneInstruction(tone)}`;

  const researchBrief = briefWithoutColdEmail(brief);

  try {
    const result = await callClaudeJson(
      client,
      system,
      `Write a ${tone} cold email for ${companyName} using this research (no existing email — write fresh):\n${JSON.stringify(researchBrief, null, 2)}\n\nReturn ONLY the JSON object.`,
      1500,
      30000,
      0.85,
    ) as Record<string, unknown>;

    const { coldEmail, derivedOpener } = normalizeColdEmailOnly(result, brief);
    if (derivedOpener) {
      req.log.info({ companyName, tone }, "Derived cold email opener after regenerate omitted it");
    }

    res.json(coldEmail);
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
  "opening": "One sentence opener referencing a specific signal — no throat-clearing",
  "discoveryQuestions": ["Max 5 questions, each under 18 words, open-ended, tied to a specific finding"]
}
No fluff. Every question must bridge to what we sell.${buildActionContext(linkedinPosts, ownIntel, yourCompany)}`;

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

type MeetingType = "discovery" | "demo" | "renewal";

function buildPrepMeetingInstruction(meetingType: MeetingType): string {
  switch (meetingType) {
    case "discovery":
      return `MEETING TYPE: Discovery call (first or early conversation).
Focus on qualifying fit, understanding pains, and building rapport. Key questions should be open-ended discovery — reference specific signals from the brief (job postings, triggers, LinkedIn). The ask should be a clear next step (e.g. schedule a demo, introduce a technical stakeholder, share a use case).`;
    case "demo":
      return `MEETING TYPE: Product demo.
Focus on mapping our solution to their specific pains. Key questions should validate success criteria, decision process, and timeline. The ask should advance the deal (e.g. trial, POC scoping, proposal timeline, bring in economic buyer).`;
    case "renewal":
      return `MEETING TYPE: Renewal or expansion conversation.
Focus on value delivered, satisfaction gaps, and growth opportunities. Key questions should surface expansion potential and risk. The ask should be concrete (renewal terms, upsell scope, executive reference, multi-year commitment).`;
  }
}

router.post("/account-brief/prep", async (req, res): Promise<void> => {
  const { companyName, brief, meetingType, linkedinPosts, ownIntel, yourCompany } = req.body as {
    companyName?: string;
    brief?: Record<string, unknown>;
    meetingType?: MeetingType;
    linkedinPosts?: Array<{ role: string; content: string }>;
    ownIntel?: string;
    yourCompany?: YourCompanyInput;
  };

  if (!companyName || !brief) {
    res.status(400).json({ error: "companyName and brief are required" });
    return;
  }

  const type: MeetingType = meetingType === "demo" || meetingType === "renewal" ? meetingType : "discovery";

  const system = `You are a senior B2B AE preparing for a call in 10 minutes. Distil the brief into a scannable prep card — bullets only, zero fluff.

Return ONLY valid JSON with this exact shape:
{
  "meetingType": "${type}",
  "whoYouAreMeeting": ["1-2 bullets: persona, title, why they care — each under 15 words"],
  "whatTheyCareAbout": ["Max 4 bullets — specific pains/pressures from research, not generic"],
  "yourAngle": ["1-2 bullets: why us, why now — tied to findings"],
  "keyQuestions": ["Max 5 questions for this meeting type — each under 18 words, reference the brief"],
  "askForThisCall": "One sentence outcome to ask for before hanging up",
  "openingLine": "One sentence to say when they pick up"
}

Every bullet must trace to research in the brief.${buildActionContext(linkedinPosts, ownIntel, yourCompany)}

${buildPrepMeetingInstruction(type)}`;

  const researchBrief = briefWithoutColdEmail(brief);

  try {
    const result = await callClaudeJson(
      client,
      system,
      `Generate a ${type} call prep card for ${companyName}.\nBrief:\n${JSON.stringify(researchBrief, null, 2)}\n\nReturn ONLY the JSON object.`,
      2500,
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
