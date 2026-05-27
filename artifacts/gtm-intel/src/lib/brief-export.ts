import type { AccountBrief, TalkTrack } from "@workspace/api-client-react";
import { stripCitationTags } from "./strip-citations";
import {
  buyerDisplayName,
  buyerExportLine,
  callPriorityLabel,
  fitHighlights,
  worldBullets,
  snapshotPainPoints,
} from "./brief-helpers";

export function formatBriefForExport(brief: AccountBrief, companyName: string, talkTrack?: TalkTrack | null): string {
  const pains = snapshotPainPoints(brief);
  const lines = [
    `GTM INTELLIGENCE BRIEF`,
    `Company: ${companyName}`,
    `Generated: ${new Date().toLocaleString()}`,
    ``,
  ];

  if (brief.callDecision) {
    lines.push(
      `=== CALL DECISION: ${callPriorityLabel(brief.callDecision.priority).toUpperCase()} ===`,
      brief.callDecision.justification,
      ``,
    );
  }

  lines.push(
    `=== OPENER ===`,
    stripCitationTags(brief.coldEmail.opener),
    ``,
  );

  const triggers = brief.recentTriggers?.items ?? [];
  if (triggers.length > 0) {
    lines.push(`=== WHY NOW ===`);
    lines.push(...triggers.map(t => `• ${t.event} (${t.recency}) — ${t.significance}`));
    lines.push(``);
  }

  const committee = brief.buyingCommittee ?? [];
  if (committee.length > 0) {
    lines.push(`=== WHO TO CALL ===`);
    lines.push(...committee.map(p => buyerExportLine(p)));
    lines.push(``);
  }

  if (brief.discoveryQuestions?.length) {
    lines.push(`=== QUESTIONS TO ASK ===`);
    lines.push(...brief.discoveryQuestions.map(q => `• ${q.question}${q.tiedToSignal ? ` [re: ${q.tiedToSignal}]` : ""}`));
    lines.push(``);
  }

  if (brief.manualResearchTips?.length) {
    lines.push(`=== CHECK MANUALLY BEFORE CALLING ===`);
    lines.push(...brief.manualResearchTips.map(t => `• ${t.tip}${t.reason ? ` — ${t.reason}` : ""}`));
    lines.push(``);
  }

  lines.push(
    `=== BACKGROUND ===`,
    `${brief.companySnapshot.size} · ${brief.companySnapshot.industry} · ${brief.companySnapshot.location} · ${brief.companySnapshot.fundingStage}`,
  );
  if (brief.companySnapshot.techStack) lines.push(`Tech: ${brief.companySnapshot.techStack}`);
  if (pains.length > 0) {
    lines.push(`Possible pain points:`);
    lines.push(...pains.map(p => `• ${p}`));
  }
  lines.push(
    ``,
    `Account fit: ${brief.icpFitScore.score}/10`,
    ...fitHighlights(brief).map(h => `• ${h}`),
    ``,
    `Their world:`,
    ...worldBullets(brief).map(b => `• ${b}`),
    ``,
    `=== FULL COLD EMAIL ===`,
    stripCitationTags(brief.coldEmail.fullEmail || brief.coldEmail.opener),
  );

  if (talkTrack) {
    lines.push(
      ``,
      `=== DISCOVERY TALK TRACK ===`,
      talkTrack.opening,
      ``,
      `Questions:`,
      ...talkTrack.discoveryQuestions.map(q => `• ${q}`),
    );
  }

  return lines.filter(l => l !== null).join("\n");
}

export function downloadBriefTxt(content: string, companyName: string) {
  const slug = companyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "brief";
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gtm-brief-${slug}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printBriefPdf(brief: AccountBrief, companyName: string, talkTrack?: TalkTrack | null) {
  const pains = snapshotPainPoints(brief);
  const callBlock = brief.callDecision
    ? `<h2>Call Decision — ${callPriorityLabel(brief.callDecision.priority)}</h2><p>${brief.callDecision.justification}</p>`
    : "";
  const questionsBlock = brief.discoveryQuestions?.length
    ? `<h2>Questions to Ask</h2><ul>${brief.discoveryQuestions.map(q => `<li>${q.question}</li>`).join("")}</ul>`
    : "";
  const tipsBlock = brief.manualResearchTips?.length
    ? `<h2>Check Manually</h2><ul>${brief.manualResearchTips.map(t => `<li>${t.tip}</li>`).join("")}</ul>`
    : "";

  const html = `<!DOCTYPE html><html><head><title>GTM Brief — ${companyName}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; color: #111; line-height: 1.5; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #0d9488; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; margin-top: 24px; }
  p, li { font-size: 14px; }
  ul { padding-left: 1rem; }
  pre { white-space: pre-wrap; font-family: inherit; background: #f5f5f5; padding: 12px; border-radius: 6px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>${companyName}</h1>
<p class="meta">GTM Intelligence Brief · ${new Date().toLocaleDateString()}</p>
${callBlock}
<h2>Opener</h2>
<p><em>${brief.coldEmail.opener}</em></p>
<h2>Why Now</h2>
<ul>${(brief.recentTriggers?.items ?? []).map(t => `<li>${t.event} (${t.recency}) — ${t.significance}</li>`).join("")}</ul>
<h2>Who to Call</h2>
<ul>${(brief.buyingCommittee ?? []).slice(0, 3).map(p => `<li><strong>${buyerDisplayName(p)}</strong>: ${p.painPoint}</li>`).join("")}</ul>
${questionsBlock}
${tipsBlock}
<h2>Background</h2>
<p>${brief.companySnapshot.size} · ${brief.companySnapshot.industry} · ${brief.companySnapshot.location} · ${brief.companySnapshot.fundingStage}</p>
${brief.companySnapshot.techStack ? `<p><strong>Tech:</strong> ${brief.companySnapshot.techStack}</p>` : ""}
${pains.length ? `<ul>${pains.map(p => `<li>${p}</li>`).join("")}</ul>` : ""}
<h2>Account Fit — ${brief.icpFitScore.score}/10</h2>
<ul>${fitHighlights(brief).map(h => `<li>${h}</li>`).join("")}</ul>
<h2>Full Email</h2>
<pre>${brief.coldEmail.fullEmail || brief.coldEmail.opener}</pre>
${talkTrack ? `<h2>Discovery Talk Track</h2><p>${talkTrack.opening}</p><ul>${talkTrack.discoveryQuestions.map(q => `<li>${q}</li>`).join("")}</ul>` : ""}
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}
