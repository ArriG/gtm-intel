import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search, Zap, AlertCircle, ChevronRight, Compass } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { MarketProspectResponse } from "@workspace/api-client-react";
import { loadYourCompany, useDiscoverEnabled, yourCompanyForRequest } from "@/lib/your-company";

const MAX_RESULTS = 20;

const DISCOVER_SOURCES = [
  "Public web search — company websites and other publicly indexed pages",
  "Australian B2B markets by default (unless your description specifies otherwise)",
  "Your Company profile to align matches with your ICP",
] as const;

function DiscoverUnavailable() {
  return (
    <div className="min-h-screen flex items-center justify-center px-8 py-16">
      <Card className="max-w-md w-full border-dashed bg-muted/20">
        <CardContent className="p-10 text-center space-y-4">
          <Compass className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-lg font-semibold">Discover is available for SMB outreach</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This feature is currently scoped to small-business outreach. To use it, select &lsquo;SMB&rsquo; in your deal size on the Your Company page.
            </p>
          </div>
          <Link href="/your-company">
            <Button className="rounded-xl">Go to Your Company</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function DiscoverExplainer() {
  return (
    <Card className="mb-6 border-border/80 bg-muted/20">
      <CardContent className="p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Discover (early feature)</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Build a focused outreach list of up to 20 accounts that match your ICP.
          </p>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>We currently search a small set of sources suited to SMB outreach:</p>
          <ul className="list-disc pl-5 space-y-1">
            {DISCOVER_SOURCES.map(source => (
              <li key={source}>{source}</li>
            ))}
          </ul>
          <p>
            For larger or more structured account discovery, tools like Clay or LinkedIn Sales Navigator will serve you better. Discover is built for smaller, bespoke outreach lists where each account gets briefed and contacted with context.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketProspectPage() {
  const discoverEnabled = useDiscoverEnabled();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MarketProspectResponse | null>(null);

  const companies = useMemo(
    () => (results?.companies ?? []).slice(0, MAX_RESULTS),
    [results],
  );

  if (!discoverEnabled) {
    return <DiscoverUnavailable />;
  }

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
          <Compass className="w-6 h-6 text-primary mb-4" />
          <PageHeader
            title="Discover"
            subtitle="Describe your target market in plain English — get up to 20 matching companies to brief and contact."
            subtitleClassName="mb-6"
          />
          <DiscoverExplainer />
          <form onSubmit={handleSearch} className="space-y-3">
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Small mortgage brokers in Sydney with 10–30 staff, actively hiring loan processors..."
              rows={4}
              className="resize-none text-sm"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !description.trim()} className="gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Searching...</> : <><Search className="w-4 h-4" />Find companies</>}
            </Button>
          </form>
          {loading && (
            <p className="text-xs text-muted-foreground mt-3 font-mono flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />Searching the web for matching companies — 30–60 seconds...
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
            <p className="text-xs text-muted-foreground font-mono">
              {companies.length} {companies.length === 1 ? "company" : "companies"} found
              {results.companies.length > MAX_RESULTS ? ` (showing first ${MAX_RESULTS})` : ""}
            </p>
            {companies.map((company, i) => (
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
              Your Company profile is saved — describe industry, size, geography, and signals you care about to build a short outreach list.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
