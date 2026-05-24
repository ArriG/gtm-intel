import { useState } from "react";
import { Link } from "wouter";
import { useListSignals, useUpdateSignal, useDeleteSignal, getListSignalsQueryKey, useListIcps } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Check, Radio, Loader2, Radar, ExternalLink, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { loadYourCompany, useYourCompany, yourCompanyHasRadarContext, type YourCompany } from "@/lib/your-company";
import { apiUrl } from "@/lib/api-url";

const IMPORTANCE_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

const TYPE_LABELS: Record<string, string> = {
  pricing_change: "Pricing Change",
  product_launch: "Product Launch",
  funding: "Funding",
  hiring: "Hiring",
  partnership: "Partnership",
  other: "Other",
};

function yourCompanyForRequest(yc: YourCompany): YourCompany | undefined {
  const trimmed: YourCompany = {
    companyName: yc.companyName.trim(),
    whatYouSell: yc.whatYouSell.trim(),
    whoYouSellTo: yc.whoYouSellTo.trim(),
    painPoints: yc.painPoints.trim(),
    customerOutcomes: yc.customerOutcomes.trim(),
  };
  if (!Object.values(trimmed).some(Boolean)) return undefined;
  return trimmed;
}

export default function Signals() {
  const { data: signals, isLoading } = useListSignals();
  const { data: icps } = useListIcps();
  const yourCompany = useYourCompany();
  const updateSignal = useUpdateSignal();
  const deleteSignal = useDeleteSignal();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState("all");
  const [filterImportance, setFilterImportance] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  async function handleScan() {
    setScanError(null);
    setScanning(true);
    try {
      const res = await fetch(apiUrl("/api/account-brief/signal-radar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yourCompany: yourCompanyForRequest(loadYourCompany()) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Scan failed (${res.status})`);
      }
      await queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  function handleToggleReviewed(id: number, reviewed: boolean) {
    updateSignal.mutate({ id, data: { reviewed: !reviewed } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      },
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Dismiss this signal?")) return;
    deleteSignal.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      },
    });
  }

  const filtered = signals?.filter(s => {
    if (filterType !== "all" && s.type !== filterType) return false;
    if (filterImportance !== "all" && s.importance !== filterImportance) return false;
    return true;
  });

  const hasIcps = (icps?.length ?? 0) > 0;
  const hasSellerContext = yourCompanyHasRadarContext(yourCompany);
  const canRunRadar = hasIcps || hasSellerContext;
  const unreviewed = signals?.filter(s => !s.reviewed).length ?? 0;

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <PageHeader
          title="Signal Radar"
          subtitle="Your Company defines the industry to watch. ICPs refine who within it. The web tells you what's happening."
        />
        <Button
          onClick={handleScan}
          disabled={scanning || !canRunRadar}
          className="gap-2 shrink-0"
        >
          {scanning
            ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning web...</>
            : <><Radar className="w-4 h-4" />Run Radar</>}
        </Button>
      </div>

      {!canRunRadar && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">Set up Your Company first</p>
              <p className="text-amber-800/80 mt-0.5">
                The radar searches for buying signals in your target industry.{" "}
                <Link href="/your-company" className="underline font-medium">Fill in who you sell to</Link>{" "}
                or <Link href="/icps" className="underline font-medium">define an ICP</Link>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {canRunRadar && !hasSellerContext && (
        <Card className="border-border bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Running on ICPs only.{" "}
            <Link href="/your-company" className="underline text-foreground">Add Your Company</Link>{" "}
            to anchor scans to your industry.
          </CardContent>
        </Card>
      )}

      {scanError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{scanError}</CardContent>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap items-center">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterImportance} onValueChange={setFilterImportance}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by importance" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Importance</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        {unreviewed > 0 && (
          <Badge variant="secondary" className="ml-auto">{unreviewed} new</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filtered?.length === 0 ? (
        <Card className="p-12 text-center bg-muted/30 border-dashed">
          <Radio className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-1">No signals yet</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Set up <Link href="/your-company" className="underline">Your Company</Link> to define your industry, then hit Run Radar to scan Seek, AFR, LinkedIn, and company news for buying triggers.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered?.map(signal => (
            <Card key={signal.id} className={signal.reviewed ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`shrink-0 mt-0.5 ${signal.reviewed ? "text-green-600" : "text-muted-foreground"}`}
                    onClick={() => handleToggleReviewed(signal.id, signal.reviewed)}
                    title={signal.reviewed ? "Mark as new" : "Mark as reviewed"}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        {signal.companyName && (
                          <p className="text-xs font-medium text-primary mb-0.5">{signal.companyName}</p>
                        )}
                        <p className={`font-semibold ${signal.reviewed ? "line-through text-muted-foreground" : ""}`}>
                          {signal.title}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        {signal.icpName && (
                          <Badge variant="secondary" className="text-xs">{signal.icpName}</Badge>
                        )}
                        <Badge variant="outline" className="text-xs font-mono">{TYPE_LABELS[signal.type] || signal.type}</Badge>
                        <Badge className={`text-xs border ${IMPORTANCE_COLORS[signal.importance] || ""}`}>{signal.importance}</Badge>
                      </div>
                    </div>
                    {signal.description && <p className="text-sm text-muted-foreground mt-1.5">{signal.description}</p>}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground flex-wrap items-center">
                      <span>via {signal.source}</span>
                      <span>•</span>
                      <span>{new Date(signal.createdAt).toLocaleDateString()}</span>
                      {signal.companyDomain && (
                        <>
                          <span>•</span>
                          <Link
                            href={`/?q=${encodeURIComponent(signal.companyDomain)}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                          >
                            Research brief <ExternalLink className="w-3 h-3" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(signal.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
