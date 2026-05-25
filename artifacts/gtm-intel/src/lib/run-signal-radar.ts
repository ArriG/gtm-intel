import type { Icp } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";
import type { YourCompany } from "@/lib/your-company";

type MarketProspectCompany = {
  name: string;
  domain?: string;
  reason?: string;
  estimatedSize?: string;
};

function buildFallbackDescription(yourCompany?: YourCompany, icps?: Icp[]): string {
  const parts = [
    yourCompany?.industryServed?.trim() || yourCompany?.whoYouSellTo?.trim(),
    yourCompany?.oneLineDescription?.trim() || yourCompany?.whatYouSell?.trim(),
    icps?.length
      ? `ICP targets: ${icps.map(i => `${i.name} (${i.industry})`).join("; ")}`
      : null,
    "Find 5–8 real Australian companies with recent buying signals in the last 90 days — funding rounds, hiring spikes on Seek, product launches, leadership changes, or expansion.",
    "Prioritise companies where the trigger suggests an active buying window.",
  ];
  return parts.filter(Boolean).join(". ");
}

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error || `Scan failed (${res.status})`;
}

/** Fallback for stale API bundles that lack signal-radar routes. */
async function runRadarViaMarketProspect(
  yourCompany: YourCompany | undefined,
  icps: Icp[] | undefined,
): Promise<void> {
  const res = await fetch(apiUrl("/api/market-prospect"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: buildFallbackDescription(yourCompany, icps),
      yourCompany,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const data = await res.json() as { companies?: MarketProspectCompany[] };
  const companies = data.companies ?? [];

  for (const company of companies.slice(0, 8)) {
    const signalRes = await fetch(apiUrl("/api/signals"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: company.reason ? `${company.name} — ${company.reason}` : company.name,
        description: company.reason || undefined,
        type: "other",
        source: "Signal radar",
        importance: "medium",
        competitorName: company.name,
      }),
    });
    if (!signalRes.ok) {
      throw new Error(await parseError(signalRes));
    }
  }
}

export async function runSignalRadarScan(
  yourCompany: YourCompany | undefined,
  icps: Icp[] | undefined,
): Promise<void> {
  const res = await fetch(apiUrl("/api/market-prospect"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "signal-radar", yourCompany }),
  });

  if (res.ok) return;

  // Stale Replit bundle: no signal-radar route yet — use market-prospect + manual signal create.
  if (res.status === 404 || res.status === 400) {
    await runRadarViaMarketProspect(yourCompany, icps);
    return;
  }

  throw new Error(await parseError(res));
}
