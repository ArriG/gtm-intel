import type Anthropic from "@anthropic-ai/sdk";
import type { icpsTable } from "@workspace/db/schema";

export type YourCompanyInput = {
  companyName?: string;
  whatYouSell?: string;
  whoYouSellTo?: string;
  painPoints?: string;
  customerOutcomes?: string;
};

export type EmailTone = "formal" | "direct" | "conversational";

export type UserContextFlags = {
  hasLinkedIn: boolean;
  hasOwnIntel: boolean;
  hasYourCompany: boolean;
};

const EMAIL_TONE_INSTRUCTIONS: Record<EmailTone, string> = {
  formal: `FORMAL tone requirements:
- Greeting: "Dear [Name]" or "Hello [Name]"
- Complete sentences, no contractions, no exclamation marks
- Third-person company references where appropriate ("your organisation")
- Close: "Kind regards" or "Best regards"`,
  direct: `DIRECT tone requirements:
- Greeting: "Hi [Name]"
- Short sentences, confident and peer-level
- Lead with the signal, then the outcome — no fluff
- Close: "Worth a quick call?" or similar single-line CTA`,
  conversational: `CONVERSATIONAL tone requirements:
- Greeting: "Hey [Name]" or "Hi [Name]"
- Warm, human phrasing — contractions OK ("you're", "it's")
- One relatable observation before the pitch
- Close: casual but professional ("Happy to chat if useful")`,
};

/** Strip Anthropic web-search citation markup that leaks into JSON text fields */
export function stripCitationTags(text: string): string {
  return text.replace(/<\/?cite[^>]*>/gi, "");
}

export function sanitizeAiStrings(value: unknown): unknown {
  if (typeof value === "string") return stripCitationTags(value);
  if (Array.isArray(value)) return value.map(sanitizeAiStrings);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeAiStrings(v);
    }
    return out;
  }
  return value;
}

export function buildIcpScoringContext(
  icps: typeof icpsTable.$inferSelect[],
  userContext: UserContextFlags,
): string {
  const contextNote = userContext.hasLinkedIn || userContext.hasOwnIntel || userContext.hasYourCompany
    ? `\nIMPORTANT — Use all AE-provided context (Your Company profile, own intel, pasted LinkedIn posts) when scoring:
- Weight verified AE intel and LinkedIn quotes heavily — they override weak web signals.
- Match against ICP pain points, goals, and job titles explicitly — cite which ICP fields align or misalign.
- If Your Company "who we sell to" is provided, score fit for OUR solution, not generic B2B fit.
- Penalise score if industry/size match but pain points clearly don't align with any defined ICP.`
    : "";

  if (!icps || icps.length === 0) {
    return `Score ICP fit from 1-10 where 10 is a perfect fit for a GTM intelligence platform used by B2B SaaS sales and marketing teams. Use general best-practice ICP criteria.${contextNote}`;
  }

  const descriptions = icps.map((icp, i) => {
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
In your reason, name which ICP they best match (or "none") and cite specific evidence — job postings, intel, LinkedIn signals, or company profile.
Score each dimension: industry match, size match, pain point alignment, and buyer role presence.
If they match none well, explain what's misaligned and still give an honest numeric score (don't default to 5).${contextNote}

DEFINED ICPs:
${descriptions}`;
}

export function buildYourCompanyContext(yourCompany?: YourCompanyInput): string {
  if (!yourCompany) return "";

  const lines = [
    yourCompany.companyName?.trim() ? `Company name: ${yourCompany.companyName.trim()}` : null,
    yourCompany.whatYouSell?.trim() ? `What we sell: ${yourCompany.whatYouSell.trim()}` : null,
    yourCompany.whoYouSellTo?.trim() ? `Who we sell to: ${yourCompany.whoYouSellTo.trim()}` : null,
    yourCompany.painPoints?.trim() ? `Problems we solve: ${yourCompany.painPoints.trim()}` : null,
    yourCompany.customerOutcomes?.trim() ? `Customer outcomes we deliver: ${yourCompany.customerOutcomes.trim()}` : null,
  ].filter(Boolean);

  if (lines.length === 0) return "";

  return `\n\nSELLER CONTEXT — THE AE'S COMPANY (highest priority for positioning and cold email):
${lines.join("\n")}
Use this to tailor the coldEmail value statement and fullEmail — reference what we sell and the outcomes we deliver, not generic SaaS language.`;
}

export function buildLinkedinContext(
  linkedinPosts?: Array<{ role: string; content: string }>,
): string {
  if (!linkedinPosts || linkedinPosts.length === 0) return "";
  return `\n\nLINKEDIN CONTEXT FROM AE (PRIMARY EVIDENCE — treat as verified signals):
${linkedinPosts.map(p => `${p.role}: "${p.content}"`).join("\n\n")}
Use their exact language in the theirWorld narrative, cold email opener, and ICP scoring. Tag as type "linkedin", confidence "verified".`;
}

export function buildOwnIntelContext(ownIntel?: string): string {
  if (!ownIntel?.trim()) return "";
  return `\n\nAE'S OWN INTEL (highest priority — ground truth from direct interactions):
${ownIntel.trim()}
Incorporate throughout the brief and ICP scoring. Tag as type "own_intel", confidence "verified".`;
}

export function buildEmailToneInstruction(emailTone: EmailTone = "direct"): string {
  return `\n\nCOLD EMAIL TONE (mandatory — the email MUST read as ${emailTone.toUpperCase()}):
${EMAIL_TONE_INSTRUCTIONS[emailTone]}
Do not use HTML, XML, or cite tags. Plain text only in all JSON string values.`;
}

export function parseJsonFromResponse(text: string): unknown {
  let jsonText = text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (jsonMatch) jsonText = jsonMatch[1].trim();
  jsonText = jsonText.replace(/<\/?cite[^>]*>/gi, "");
  return sanitizeAiStrings(JSON.parse(jsonText));
}

export async function callClaudeJson(
  client: Anthropic,
  system: string,
  userMessage: string,
  maxTokens = 1500,
  timeoutMs = 30000,
  temperature?: number,
): Promise<unknown> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out — please try again")), timeoutMs),
  );

  const message = await Promise.race([
    client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
    timeoutPromise,
  ]) as Anthropic.Message;

  const textBlock = message.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No response generated. Please try again.");
  }

  return parseJsonFromResponse(textBlock.text);
}

export async function callClaudeJsonWithSearch(
  client: Anthropic,
  system: string,
  userMessage: string,
  maxTokens = 2000,
  timeoutMs = 45000,
): Promise<unknown> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out — please try again")), timeoutMs),
  );

  const message = await Promise.race([
    client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      tools: [{ type: "web_search_20250305", name: "web_search" } as any],
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
    timeoutPromise,
  ]) as Anthropic.Message;

  const textBlock = message.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No response generated. Please try again.");
  }

  return parseJsonFromResponse(textBlock.text);
}
