import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Loader2, Radio, Search } from "lucide-react";
import { scanAccountSignals } from "@workspace/api-client-react";
import { BearMark } from "@/components/bear-mark";
import { Button } from "@/components/ui/button";
import { BriefCard, BriefCardContent } from "@/components/brief-card";
import { SignalCard } from "@/components/signal-card";
import {
  getWatchedBriefs,
  updateHistoryEntry,
  useHistory,
  visibleSignals,
} from "@/lib/history";
import {
  countReadyToReengage,
  countSignalsThisWeek,
  countWatchedAccounts,
  formatRelativeScanTime,
  sortWatchedBriefs,
} from "@/lib/signal-tracking";
import { loadYourCompany, yourCompanyForRequest } from "@/lib/your-company";

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <BriefCard>
      <BriefCardContent className="pt-5">
        <p className="text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </BriefCardContent>
    </BriefCard>
  );
}

export default function SignalsPage() {
  const history = useHistory();
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanErrors, setScanErrors] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const watchedBriefs = useMemo(
    () => sortWatchedBriefs(getWatchedBriefs()),
    [history, refreshKey],
  );

  const watchedCount = countWatchedAccounts(history);
  const signalsThisWeek = countSignalsThisWeek(history);
  const readyToReengage = countReadyToReengage(history);

  async function handleScan(briefId: string, company: string, brief: Parameters<typeof scanAccountSignals>[0]["brief"]) {
    const yourCompany = yourCompanyForRequest(loadYourCompany());
    if (!yourCompany) return;

    setScanningId(briefId);
    setScanErrors(current => {
      const next = { ...current };
      delete next[briefId];
      return next;
    });

    try {
      const result = await scanAccountSignals({
        company,
        brief,
        yourCompany,
        sectorPackOverride: yourCompany.sectorPackOverride,
      });

      updateHistoryEntry(briefId, {
        signals: result.signals,
        lastScannedAt: result.scannedAt,
      });
      setRefreshKey(key => key + 1);
    } catch (err) {
      setScanErrors(current => ({
        ...current,
        [briefId]: err instanceof Error ? err.message : "Couldn't scan right now — try again in a moment.",
      }));
    } finally {
      setScanningId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-primary text-foreground px-8 py-14 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <BearMark size={52} className="mb-6" />
          <p className="text-sm font-bold tracking-wide text-foreground/80 mb-3">Research</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-2xl">
            Signals
          </h1>
          <p className="mt-4 text-lg font-medium text-foreground/85 leading-snug max-w-2xl">
            Watch accounts you have briefed and scan for fresh buying signals to re-open conversations with context.
          </p>
        </div>
      </div>

      <div className="bg-secondary px-8 py-10 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryTile label="Accounts watched" value={watchedCount} />
            <SummaryTile label="Signals this week" value={signalsThisWeek} />
            <SummaryTile label="Briefs ready to re-engage" value={readyToReengage} />
          </div>

          {watchedCount === 0 ? (
            <BriefCard className="border-dashed">
              <BriefCardContent className="py-12 text-center space-y-4">
                <Radio className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <div className="space-y-2 max-w-md mx-auto">
                  <h2 className="text-lg font-semibold">No accounts being watched yet</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Generate a brief on the Search page to start tracking signals.
                  </p>
                </div>
                <Link href="/">
                  <Button className="rounded-xl gap-2">
                    <Search className="w-4 h-4" />
                    Go to Search
                  </Button>
                </Link>
              </BriefCardContent>
            </BriefCard>
          ) : (
            <div className="space-y-6">
              {watchedBriefs.map(entry => {
                const signals = visibleSignals(entry);
                const scanning = scanningId === entry.id;
                const scanError = scanErrors[entry.id];

                return (
                  <section key={entry.id} className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Link href={`/?h=${entry.id}`} className="text-lg font-semibold hover:text-primary transition-colors">
                          {entry.label}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last scanned: {formatRelativeScanTime(entry.lastScannedAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-xl gap-2 shrink-0"
                        disabled={scanning || !yourCompanyForRequest(loadYourCompany())}
                        onClick={() => handleScan(entry.id, entry.label, entry.brief)}
                      >
                        {scanning
                          ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning...</>
                          : "Scan now"}
                      </Button>
                    </div>

                    {scanError && (
                      <p className="text-sm text-destructive">{scanError}</p>
                    )}

                    {signals.length === 0 && !scanning ? (
                      <BriefCard className="border-dashed bg-muted/20">
                        <BriefCardContent className="py-6 text-sm text-muted-foreground">
                          No signals in the last 90 days — try again next week.
                        </BriefCardContent>
                      </BriefCard>
                    ) : (
                      <div className="space-y-3">
                        {signals.map(signal => (
                          <SignalCard
                            key={signal.id}
                            signal={signal}
                            briefId={entry.id}
                            briefHref={`/?h=${entry.id}`}
                            brief={entry.brief}
                            onDismiss={() => setRefreshKey(key => key + 1)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
