import type { AccountBrief, TalkTrack } from "@workspace/api-client-react";

export function formatBriefForExport(brief: AccountBrief, companyName: string, talkTrack?: TalkTrack | null): string {
  const lines = [
    `GTM INTELLIGENCE BRIEF`,
    `Company: ${companyName}`,
    `Generated: ${new Date().toLocaleString()}`,
    ``,
    `=== COMPANY SNAPSHOT ===`,
    `Size: ${brief.companySnapshot.size}`,
    `Industry: ${brief.companySnapshot.industry}`,
    `Location: ${brief.companySnapshot.location}`,
    `Stage: ${brief.companySnapshot.fundingStage}`,
    brief.companySnapshot.abn ? `ABN: ${brief.companySnapshot.abn}` : null,
    brief.companySnapshot.techStack ? `Tech: ${brief.companySnapshot.techStack}` : null,
    ``,
    `=== ICP FIT: ${brief.icpFitScore.score}/10 ===`,
    brief.icpFitScore.reason,
    ``,
    `=== THEIR WORLD ===`,
    brief.theirWorld.narrative,
    ``,
    `=== BUYING COMMITTEE ===`,
    ...brief.buyingCommittee.map(p => `• ${p.title}: ${p.painPoint}`),
    ``,
    `=== RECENT TRIGGERS ===`,
    ...brief.recentTriggers.items.map(t => `• ${t.event} (${t.recency}) — ${t.significance}`),
    ``,
    `=== COLD EMAIL ===`,
    brief.coldEmail.fullEmail || brief.coldEmail.opener,
  ];

  if (talkTrack) {
    lines.push(
      ``,
      `=== DISCOVERY TALK TRACK ===`,
      talkTrack.opening,
      ``,
      `Questions:`,
      ...talkTrack.discoveryQuestions.map((q, i) => `${i + 1}. ${q}`),
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
  const html = `<!DOCTYPE html><html><head><title>GTM Brief — ${companyName}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; color: #111; line-height: 1.5; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #0d9488; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; margin-top: 24px; }
  p, li { font-size: 14px; }
  pre { white-space: pre-wrap; font-family: inherit; background: #f5f5f5; padding: 12px; border-radius: 6px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>${companyName}</h1>
<p class="meta">GTM Intelligence Brief · ${new Date().toLocaleDateString()}</p>
<h2>Company Snapshot</h2>
<p>${brief.companySnapshot.size} · ${brief.companySnapshot.industry} · ${brief.companySnapshot.location} · ${brief.companySnapshot.fundingStage}</p>
<h2>ICP Fit — ${brief.icpFitScore.score}/10</h2>
<p>${brief.icpFitScore.reason}</p>
<h2>Their World</h2>
<p>${brief.theirWorld.narrative}</p>
<h2>Buying Committee</h2>
<ul>${brief.buyingCommittee.map(p => `<li><strong>${p.title}</strong>: ${p.painPoint}</li>`).join("")}</ul>
<h2>Recent Triggers</h2>
<ul>${brief.recentTriggers.items.map(t => `<li>${t.event} (${t.recency}) — ${t.significance}</li>`).join("")}</ul>
<h2>Cold Email</h2>
<pre>${brief.coldEmail.fullEmail || brief.coldEmail.opener}</pre>
${talkTrack ? `<h2>Discovery Talk Track</h2><p>${talkTrack.opening}</p><ol>${talkTrack.discoveryQuestions.map(q => `<li>${q}</li>`).join("")}</ol>` : ""}
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}
