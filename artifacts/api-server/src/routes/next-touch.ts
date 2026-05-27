import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildEmailToneInstruction,
  buildYourCompanyContext,
  callClaudeJson,
  stripCitationTags,
  type EmailTone,
  type YourCompanyInput,
} from "../lib/brief-ai";

const router: IRouter = Router();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

router.post("/next-touch", async (req, res): Promise<void> => {
  const { brief, reply, yourCompany, tone } = req.body as {
    brief?: Record<string, unknown>;
    reply?: string;
    yourCompany?: YourCompanyInput;
    tone?: EmailTone;
  };

  if (!brief || typeof brief !== "object") {
    res.status(400).json({ error: "brief is required" });
    return;
  }

  const replyText = reply?.trim();
  if (!replyText) {
    res.status(400).json({ error: "reply is required" });
    return;
  }

  const snapshot = brief.companySnapshot as { industry?: string; location?: string } | undefined;
  const accountLabel = [snapshot?.industry, snapshot?.location].filter(Boolean).join(" · ") || "target account";
  const emailTone = tone ?? "direct";

  req.log.info({ accountLabel, tone: emailTone }, "Generating next-touch opener");

  const system = `You are a senior B2B AE writing follow-up outreach after receiving a reply.
Return ONLY valid JSON with this exact shape:
{ "opener": "...", "suggestion": "..." }

Rules for opener:
- Acknowledge what the prospect actually said in their reply — do not ignore their words
- Address any objection or question directly and honestly
- Propose one concrete next step (call, share a resource, loop in a colleague, etc.)
- 2–4 sentences max; plain text only; no subject line
- Honour the ${emailTone.toUpperCase()} tone${buildEmailToneInstruction(emailTone)}

Rules for suggestion:
- 1–3 sentences coaching the AE on angle, what to ask, or what to send next
- Consultative and practical — not salesy or pushy${buildYourCompanyContext(yourCompany)}`;

  try {
    const result = await callClaudeJson(
      client,
      system,
      `Research brief for this account:\n${JSON.stringify(brief, null, 2)}\n\nProspect's reply (verbatim):\n${replyText}\n\nReturn ONLY the JSON object.`,
      1200,
      30000,
      0.85,
    ) as { opener?: string; suggestion?: string };

    const opener = stripCitationTags(result.opener?.trim() ?? "");
    const suggestion = stripCitationTags(result.suggestion?.trim() ?? "");

    if (!opener || !suggestion) {
      res.status(500).json({ error: "Failed to generate next touch. Please try again." });
      return;
    }

    res.json({
      opener,
      suggestion,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    req.log.error({ err, accountLabel, tone: emailTone }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
