import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search, Zap, AlertCircle, ChevronRight, Target } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { MarketProspectResponse } from "@workspace/api-client-react";
import { loadYourCompany, yourCompanyForRequest } from "@/lib/your-company";

export default function MarketProspectPage() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MarketProspectResponse | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/market-prospect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          yourCompany: yourCompanyForRequest(loadYourCompany()),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
      }
      setResults(await res.json() as MarketProspectResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-gradient-to-br from-background via-background to-primary/5 px-8 py-10">
        <div className="max-w-3xl mx-auto">
          <Target className="w-6 h-6 text-primary mb-4" />
          <PageHeader
            title="Market Prospecting"
            subtitle="Describe your target market in plain English — get 8–10 matching companies to research."
            subtitleClassName="mb-6"
          />
          <form onSubmit={handleSearch} className="space-y-3">
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Mid-market mortgage brokers in Sydney with 20–100 staff, actively hiring loan processors..."
              rows={4}
              className="resize-none text-sm"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !description.trim()} className="gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Searching...</> : <><Search className="w-4 h-4" />Find Companies</>}
            </Button>
          </form>
          {loading && (
            <p className="text-xs text-muted-foreground mt-3 font-mono flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />Searching the web for matching AU companies — 30–60 seconds...
            </p>
          )}
        </div>
      </div>

      <div className="px-8 py-8 max-w-3xl mx-auto space-y-4">
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </CardContent>
          </Card>
        )}

        {loading && !results && (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        )}

        {results && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-xs text-muted-foreground font-mono">{results.companies.length} companies found</p>
            {results.companies.map((company, i) => (
              <Link key={i} href={`/?q=${encodeURIComponent(company.domain)}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{company.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{company.domain}</div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{company.reason}</p>
                      {company.estimatedSize && (
                        <Badge variant="outline" className="text-[10px] mt-1.5">{company.estimatedSize}</Badge>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!loading && !results && !error && (
          <Card className="p-10 text-center bg-muted/30 border-dashed">
            <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h2 className="text-base font-semibold mb-1">Describe your market</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Fill in Your Company first for better matches — then describe industry, size, geography, and signals you care about.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
