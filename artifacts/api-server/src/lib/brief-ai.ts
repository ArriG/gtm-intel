import type Anthropic from "@anthropic-ai/sdk";
import type { icpsTable } from "@workspace/db/schema";

export type YourCompanyInput = {
  companyName?: string;
  oneLineDescription?: string;
  industryServed?: string;
  geographies?: string[];
  dealSize?: "smb" | "mid-market" | "enterprise";
  buyerTitles?: string[];
  painPointsSolved?: string[];
  /** Legacy fields — still accepted from older clients */
  whatYouSell?: string;
  whoYouSellTo?: string;
  painPoints?: string;
  customerOutcomes?: string;
  whyNowPattern?: string;
  reasoningOverrides?: string;
  /** Set to a sector pack id to override auto-detect; omit for automatic matching */
  sectorPackOverride?: string;
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
  yourCompany?: YourCompanyInput,
): string {
  const yourCompanyBlock = yourCompanyHasContext(yourCompany)
    ? describeYourCompany(yourCompany!)
    : null;

  const contextNote = userContext.hasLinkedIn || userContext.hasOwnIntel || userContext.hasYourCompany
    ? `\nIMPORTANT — Use all AE-provided context (Your Company profile, own intel, pasted LinkedIn posts) when scoring:
- Weight verified AE intel and LinkedIn quotes heavily — they override weak web signals.
- Score fit for what WE sell (the seller profile below), NOT generic B2B SaaS fit or fit for "GTM intelligence tools".
- If the target is a large enterprise in our target industry with relevant pains (e.g. a global insurer for underwriting software), score 8–10 — do NOT penalise for being bigger than a typical logo.
- Match against pain points and buyer titles explicitly — cite which fields align or misalign.
- Penalise the score only when industry, buyer, or pain evidence clearly does not fit our seller profile.`
    : "";

  if (!icps || icps.length === 0) {
    if (yourCompanyBlock) {
      const { product, industry, geographies, buyerTitles, painPoints, dealSize } = yourCompanyBlock;
      const sellerLines = [
        yourCompany!.companyName?.trim() ? `Seller: ${yourCompany!.companyName.trim()}` : null,
        product ? `What we sell: ${product}` : null,
        industry ? `Industry we serve: ${industry}` : null,
        geographies?.length ? `Geographies: ${geographies.join(", ")}` : null,
        dealSize ? `Typical deal motion: ${dealSize}` : null,
        buyerTitles?.length ? `Typical buyers: ${buyerTitles.join(", ")}` : null,
        painPoints ? `Pains we solve: ${painPoints}` : null,
      ].filter(Boolean);

      return `Score ACCOUNT FIT from 1-10 for the seller below — how well is this researched company a customer for what WE sell?
A score of 10 means an ideal target: right industry, relevant pains, and plausible buyers in the committee.
Score dimensions: industry/vertical match, deal size vs our motion, buyer role presence, pain point alignment.
In your reason, cite research evidence and which seller profile fields align. Do not default to 5.${contextNote}

SELLER PROFILE:
${sellerLines.join("\n")}`;
    }

    return `Score account fit from 1-10 using general B2B best-practice criteria until the AE defines ICPs or Your Company.${contextNote}`;
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

  return `Score ICP fit from 1-10 based specifically on how well this company matches the ICP definitions below AND the seller's solution.
A score of 10 means near-perfect alignment with at least one ICP and strong fit for what we sell.
In your reason, name which ICP they best match (or "none") and cite specific evidence — job postings, intel, LinkedIn signals, or company profile.
Score each dimension: industry match, size match, pain point alignment, and buyer role presence.
Large enterprises in our target industry should not be auto-downgraded if pains and buyers align.${yourCompanyBlock && userContext.hasYourCompany ? "\nAlso cross-check against the seller profile in SELLER CONTEXT below." : ""}
If they match none well, explain what's misaligned and still give an honest numeric score (don't default to 5).${contextNote}

DEFINED ICPs:
${descriptions}`;
}

export function buildIcpRadarContext(icps: typeof icpsTable.$inferSelect[]): string {
  if (!icps || icps.length === 0) {
    return "";
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
      `ICP ${i + 1} (id: ${icp.id}): "${icp.name}"`,
      `  Industry: ${icp.industry}`,
      `  Company size: ${icp.companySize}`,
      jobTitles.length ? `  Key roles: ${jobTitles.join(", ")}` : null,
      painPoints.length ? `  Pain points: ${painPoints.join("; ")}` : null,
      goals.length ? `  Goals: ${goals.join("; ")}` : null,
      channels.length ? `  Preferred channels: ${channels.join(", ")}` : null,
      icp.notes ? `  Notes: ${icp.notes}` : null,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  return `DEFINED ICPs — find companies and events that match these profiles:
${descriptions}

For each signal, set icpName to the matching ICP name and icpId to its id.`;
}

export function yourCompanyHasRadarContext(yourCompany?: YourCompanyInput): boolean {
  return yourCompanyHasContext(yourCompany);
}

export function yourCompanyHasContext(yourCompany?: YourCompanyInput): boolean {
  if (!yourCompany) return false;

  const hasProduct = Boolean(
    yourCompany.oneLineDescription?.trim() || yourCompany.whatYouSell?.trim(),
  );
  const hasMarket = Boolean(
    yourCompany.industryServed?.trim() || yourCompany.whoYouSellTo?.trim(),
  );

  return Boolean(yourCompany.companyName?.trim() && hasProduct && hasMarket);
}

function describeYourCompany(yourCompany: YourCompanyInput) {
  const product = yourCompany.oneLineDescription?.trim() || yourCompany.whatYouSell?.trim();
  const industry = yourCompany.industryServed?.trim() || yourCompany.whoYouSellTo?.trim();
  const geographies = yourCompany.geographies?.map(g => g.trim()).filter(Boolean);
  const buyerTitles = yourCompany.buyerTitles?.map(t => t.trim()).filter(Boolean);
  const painPoints = yourCompany.painPointsSolved?.length
    ? yourCompany.painPointsSolved.map(p => p.trim()).filter(Boolean).join("; ")
    : yourCompany.painPoints?.trim();
  const dealSize = yourCompany.dealSize?.replace("-", " ");

  return {
    product,
    industry,
    geographies,
    buyerTitles,
    painPoints,
    dealSize,
  };
}

export function buildYourCompanyRadarContext(yourCompany?: YourCompanyInput): string {
  if (!yourCompanyHasRadarContext(yourCompany)) return "";

  const { product, industry, geographies, buyerTitles, painPoints } = describeYourCompany(yourCompany!);

  const lines = [
    industry
      ? `Target market / industry (PRIMARY search lens — only surface companies in this space):\n  ${industry}`
      : null,
    geographies?.length ? `Geographies: ${geographies.join(", ")}` : null,
    product ? `What we sell: ${product}` : null,
    buyerTitles?.length ? `Typical buyers: ${buyerTitles.join(", ")}` : null,
    painPoints ? `Pain points we solve (judge signal relevance against these):\n  ${painPoints}` : null,
    yourCompany!.companyName?.trim()
      ? `Seller: ${yourCompany!.companyName.trim()}`
      : null,
  ].filter(Boolean);

  return `SELLER PROFILE — anchor all web searches to this industry and buyer:
${lines.join("\n")}
Only return signals from companies that fit the target market above.`;
}

export function buildYourCompanyContext(yourCompany?: YourCompanyInput): string {
  if (!yourCompany) return "";

  const { product, industry, geographies, buyerTitles, painPoints, dealSize } = describeYourCompany(yourCompany);

  const lines = [
    yourCompany.companyName?.trim() ? `Company name: ${yourCompany.companyName.trim()}` : null,
    product ? `What we sell: ${product}` : null,
    industry ? `Industry we serve: ${industry}` : null,
    geographies?.length ? `Geographies: ${geographies.join(", ")}` : null,
    dealSize ? `Typical deal size: ${dealSize}` : null,
    buyerTitles?.length ? `Typical buyers: ${buyerTitles.join(", ")}` : null,
    painPoints ? `Problems we solve: ${painPoints}` : null,
    yourCompany.customerOutcomes?.trim() ? `Customer outcomes we deliver: ${yourCompany.customerOutcomes.trim()}` : null,
  ].filter(Boolean);

  if (lines.length === 0) return "";

  return `\n\nSELLER CONTEXT — THE AE'S COMPANY (highest priority for positioning and cold email):
${lines.join("\n")}
Use this to tailor the coldEmail value statement and fullEmail — reference what we sell, who we sell to, and the outcomes we deliver, not generic SaaS language.`;
}

export function buildWhyNowPatternBlock(yourCompany?: YourCompanyInput): string {
  const pattern = yourCompany?.whyNowPattern?.trim();
  if (!pattern) return "";

  return `WHY-NOW PATTERNS — seller's winning signals (prioritise these when scoring callDecision and hunting triggers):
${pattern}

When research surfaces events matching these patterns, upgrade call priority. When nothing matches, say so honestly — do not invent triggers.`;
}

export function buildReasoningOverridesBlock(yourCompany?: YourCompanyInput): string {
  const overrides = yourCompany?.reasoningOverrides?.trim();
  if (!overrides) return "";

  return `REASONING OVERRIDES — seller-specific rules (apply within constitution limits — never override "Things we never do"):
${overrides}`;
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

/** Collect all text blocks — web-search responses often lead with prose in an earlier block. */
export function textFromMessageContent(content: Anthropic.Message["content"]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("\n")
    .trim();
}

export function parseJsonFromResponse(text: string): unknown {
  let jsonText = text.trim();
  const fenced = jsonText.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) {
    jsonText = fenced[1].trim();
  } else {
    const objectStart = jsonText.indexOf("{");
    const arrayStart = jsonText.indexOf("[");
    const start =
      objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart)
        ? objectStart
        : arrayStart;
    if (start >= 0) {
      jsonText = jsonText.slice(start);
      const open = jsonText[0];
      const close = open === "{" ? "}" : "]";
      let depth = 0;
      for (let i = 0; i < jsonText.length; i++) {
        if (jsonText[i] === open) depth++;
        else if (jsonText[i] === close) {
          depth--;
          if (depth === 0) {
            jsonText = jsonText.slice(0, i + 1);
            break;
          }
        }
      }
    }
  }
  jsonText = jsonText.replace(/<\/?cite[^>]*>/gi, "");
  try {
    return sanitizeAiStrings(JSON.parse(jsonText));
  } catch (err) {
    const preview = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `Failed to parse AI response as JSON (${err instanceof Error ? err.message : "invalid JSON"}). Preview: ${preview}`,
    );
  }
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

  const text = textFromMessageContent(message.content);
  if (!text) {
    throw new Error("No response generated. Please try again.");
  }

  return parseJsonFromResponse(text);
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

  const text = textFromMessageContent(message.content);
  if (!text) {
    throw new Error("No response generated. Please try again.");
  }

  return parseJsonFromResponse(text);
}
