import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Star, Users, AlertTriangle, Newspaper, Mail, Loader2, Sparkles } from "lucide-react";

interface BuyingCommitteeMember {
  title: string;
  painPoint: string;
}

interface AccountBrief {
  companySnapshot: {
    size: string;
    industry: string;
    location: string;
    fundingStage: string;
  };
  icpFitScore: {
    score: number;
    reason: string;
  };
  buyingCommittee: BuyingCommitteeMember[];
  topPainPoints: string[];
  recentNews: string[];
  suggestedOpeningLine: string;
}

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-all ${
            i < score
              ? score >= 8 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500"
              : "bg-muted"
          }`}
        />
      ))}
      <span className="ml-2 font-bold text-lg tabular-nums">{score}<span className="text-muted-foreground font-normal text-sm">/10</span></span>
    </div>
  );
}

export default function AccountBriefPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<AccountBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setBrief(null);
    setLastUrl(url.trim());

    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/account-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
      }

      const data = await res.json() as AccountBrief;
      setBrief(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-bold tracking-tight">Account Brief</h1>
          <Badge variant="secondary" className="gap-1 text-xs"><Sparkles className="w-3 h-3" /> AI-Powered</Badge>
        </div>
        <p className="text-muted-foreground font-mono text-sm uppercase">Instant Research · Web Search · Claude AI</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleGenerate} className="flex gap-3">
            <Input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 font-mono text-sm"
              required
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !url.trim()} className="gap-2 shrink-0">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Researching...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Brief</>
              )}
            </Button>
          </form>
          {loading && (
            <p className="text-xs text-muted-foreground mt-3 font-mono">
              Claude is searching the web for "{lastUrl}" — this takes 20–40 seconds...
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading && !brief && (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      )}

      {brief && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-xs text-muted-foreground font-mono">Brief generated for <span className="font-semibold text-foreground">{lastUrl}</span></p>

          {/* Company Snapshot */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4 text-primary" />
                Company Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Size", value: brief.companySnapshot.size },
                  { label: "Industry", value: brief.companySnapshot.industry },
                  { label: "Location", value: brief.companySnapshot.location },
                  { label: "Stage", value: brief.companySnapshot.fundingStage },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground uppercase font-mono mb-0.5">{label}</p>
                    <p className="font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ICP Fit Score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="w-4 h-4 text-yellow-500" />
                ICP Fit Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScoreDots score={brief.icpFitScore.score} />
              <p className="text-sm text-muted-foreground">{brief.icpFitScore.reason}</p>
            </CardContent>
          </Card>

          {/* Buying Committee */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-primary" />
                Likely Buying Committee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {brief.buyingCommittee.map((person, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2 bg-muted/30">
                    <p className="font-semibold text-sm">{person.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{person.painPoint}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pain Points */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Top Pain Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {brief.topPainPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold border border-orange-200">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Recent News */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Newspaper className="w-4 h-4 text-purple-500" />
                Recent News & Trigger Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {brief.recentNews.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Cold Email Opening */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="w-4 h-4 text-primary" />
                Suggested Cold Email Opening
              </CardTitle>
            </CardHeader>
            <CardContent>
              <blockquote className="border-l-4 border-primary pl-4 italic text-sm text-foreground leading-relaxed">
                "{brief.suggestedOpeningLine}"
              </blockquote>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
