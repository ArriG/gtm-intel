import type { CallPrep } from "@workspace/api-client-react";

const MEETING_LABELS: Record<CallPrep["meetingType"], string> = {
  discovery: "Discovery",
  demo: "Demo",
  renewal: "Renewal",
};

export function formatCallPrepForExport(prep: CallPrep, companyName: string): string {
  return [
    `CALL PREP — ${companyName}`,
    `Meeting type: ${MEETING_LABELS[prep.meetingType]}`,
    ``,
    `WHO YOU'RE MEETING`,
    prep.whoYouAreMeeting,
    ``,
    `WHAT THEY CARE ABOUT`,
    ...prep.whatTheyCareAbout.map(b => `• ${b}`),
    ``,
    `YOUR ANGLE`,
    prep.yourAngle,
    ``,
    `OPEN WITH`,
    prep.openingLine,
    ``,
    `KEY QUESTIONS`,
    ...prep.keyQuestions.map((q, i) => `${i + 1}. ${q}`),
    ``,
    `ASK FOR THIS CALL`,
    prep.askForThisCall,
  ].join("\n");
}

export function printCallPrep(prep: CallPrep, companyName: string) {
  const html = `<!DOCTYPE html><html><head><title>Call Prep — ${companyName}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; color: #111; line-height: 1.5; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.875rem; margin-bottom: 2rem; }
  h2 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin: 1.5rem 0 0.5rem; }
  p { margin: 0 0 0.75rem; }
  ul, ol { margin: 0; padding-left: 1.25rem; }
  li { margin-bottom: 0.5rem; }
  .ask { font-weight: 600; border-left: 3px solid #111; padding-left: 1rem; }
</style></head><body>
<h1>${companyName}</h1>
<p class="meta">${MEETING_LABELS[prep.meetingType]} call prep</p>
<h2>Who you're meeting</h2><p>${prep.whoYouAreMeeting}</p>
<h2>What they care about</h2><ul>${prep.whatTheyCareAbout.map(b => `<li>${b}</li>`).join("")}</ul>
<h2>Your angle</h2><p>${prep.yourAngle}</p>
<h2>Open with</h2><p><em>${prep.openingLine}</em></p>
<h2>Key questions</h2><ol>${prep.keyQuestions.map(q => `<li>${q}</li>`).join("")}</ol>
<h2>Ask for this call</h2><p class="ask">${prep.askForThisCall}</p>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
