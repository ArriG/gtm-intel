import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Star, Users, AlertTriangle, Newspaper,
  Mail, Loader2, Sparkles, Copy, Check, Globe, Zap, Search
} from "lucide-react";

// --- CopyButton ---
function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(getText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button
      variant="ghost" size="sm" onClick={copy}
      className={`gap-1.5 text-xs h-7 px-2 transition-colors ${copied ? "text-green-600" : "text-muted-foreground hover:text-foreground"}`}
    >
      {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
    </Button>
  );
}

// --- Score dots ---
function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
          i < score
            ? score >= 8 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500"
            : "bg-muted"
        }`} />
      ))}
      <span className="ml-2 font-bold text-lg tabular-nums">
        {score}<span className="text-muted-foreground font-normal text-sm">/10</span>
      </span>
    </div>
  );
}

// --- Avatar initials ---
function ContactAvatar({ title }: { title: string }) {
  const initials = title.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
      {initials}
    </div>
  );
}

// --- Clearbit suggestion type ---
interface CompanySuggestion {
  name: string;
  domain: string;
  logo: string;
}

// --- Autocomplete input ---
function CompanySearchInput({
  onSearch,
  loading,
}: {
  onSearch: (url: string, label: string) => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetching, setFetching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced Clearbit lookup
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await fetch(
          `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = await res.json() as CompanySuggestion[];
          setSuggestions(data.slice(0, 6));
          setShowDropdown(data.length > 0);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setFetching(false);
      }
    }, 300);
  }, [query]);

  function handleSelect(suggestion: CompanySuggestion) {
    setQuery(suggestion.name);
    setShowDropdown(false);
    setSuggestions([]);
    onSearch(`https://${suggestion.domain}`, suggestion.name);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    // If it looks like a URL use it directly, otherwise wrap it
    const url = query.trim().startsWith("http")
      ? query.trim()
      : `https://${query.trim()}`;
    onSearch(url, query.trim());
    setShowDropdown(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleManualSubmit}>
        <div className="flex gap-2 bg-background border border-border rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <div className="flex items-center pl-2 text-muted-foreground">
            {fetching
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />}
          </div>
          <Input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Type a company name or paste a URL..."
            className="flex-1 font-mono text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent"
            disabled={loading}
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="gap-2 shrink-0 rounded-lg"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Researching...</>
              : <><Zap className="w-4 h-4" />Enrich</>}
          </Button>
        </div>
      </form>

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border last:border-0"
            >
              {s.logo
                ? <img src={s.logo} alt="" className="w-6 h-6 rounded object-contain flex-shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                : <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{s.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{s.domain}</div>
              </div>
              <Zap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Types ---
interface BuyingCommitteeMember { title: string; painPoint: string; }
interface AccountBrief {
  companySnapshot: { size: string; industry: string; location: string; fundingStage: string; };
  icpFitScore: { score: number; reason: string; };
  buyingCommittee: BuyingCommitteeMember[];
  topPainPoints: string[];
  recentNews: string[];
  suggestedOpeningLine: string;
}

// --- Main page ---
export default function AccountBriefPage() {
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<AccountBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLabel, setLastLabel] = useState("");

  async function handleSearch(url: string, label: string) {
    setLoading(true);
    setError(null);
    setBrief(null);
    setLastLabel(label);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/account-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
      }
      setBrief(await res.json() as AccountBrief);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const copyAll = () => {
    if (!brief) return "";
    return `GTM BRIEF: ${lastLabel}\n\nCOMPANY\nSize: ${brief.companySnapshot.size} | Industry: ${brief.companySnapshot.industry} | Location: ${brief.companySnapshot.location} | Stage: ${brief.companySnapshot.fundingStage}\n\nICP FIT: ${brief.icpFitScore.score}/10\n${brief.icpFitScore.reason}\n\nBUYING COMMITTEE\n${brief.buyingCommittee.map(p => `• ${p.title}: ${p.painPoint}`).join("\n")}\n\nPAIN POINTS\n${brief.topPainPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\nNEWS & TRIGGERS\n${brief.recentNews.join("\n")}\n\nCOLD EMAIL OPENER\n${brief.suggestedOpeningLine}`;
  };

  return (
    <div className="min-h-screen">

      {/* Gradient hero */}
      <div className="border-b border-border bg-gradient-to-br from-background via-background to-primary/5 px-8 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="gap-1 text-xs font-mono">
              <Sparkles className="w-3 h-3" />AI · Live Web Search · Instant
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Search Companies</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            Type a company name or paste a URL — get a full GTM intelligence brief in 30 seconds.
          </p>
          <CompanySearchInput onSearch={handleSearch} loading={loading} />
          {loading && (
            <p className="text-xs text-muted-foreground mt-3 font-mono flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Researching {lastLabel} across the web — 20–40 seconds...
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="px-8 py-8 max-w-3xl mx-auto space-y-4">
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {loading && !brief && (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        )}

        {brief && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-mono">
                Brief for <span className="font-semibold text-foreground">{lastLabel}</span>
              </p>
              <CopyButton getText={copyAll} />
            </div>

            {/* Company Snapshot */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="w-4 h-4 text-primary" />Company Snapshot
                </CardTitle>
                <CopyButton getText={() =>
                  `Size: ${brief.companySnapshot.size} | Industry: ${brief.companySnapshot.industry} | Location: ${brief.companySnapshot.location} | Stage: ${brief.companySnapshot.fundingStage}`
                } />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border border border-border rounded-lg overflow-hidden">
                  {[
                    { label: "Size", value: brief.companySnapshot.size },
                    { label: "Industry", value: brief.companySnapshot.industry },
                    { label: "Location", value: brief.companySnapshot.location },
                    { label: "Stage", value: brief.companySnapshot.fundingStage },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-4 py-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase font-mono mb-1">{label}</p>
                      <p className="font-semibold text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ICP Fit Score */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Star className="w-4 h-4 text-yellow-500" />ICP Fit Score
                </CardTitle>
                <CopyButton getText={() => `ICP Score: ${brief.icpFitScore.score}/10 — ${brief.icpFitScore.reason}`} />
              </CardHeader>
              <CardContent className="space-y-3">
                <ScoreDots score={brief.icpFitScore.score} />
                <p className="text-sm text-muted-foreground">{brief.icpFitScore.reason}</p>
              </CardContent>
            </Card>

            {/* Buying Committee */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="w-4 h-4 text-primary" />Likely Buying Committee
                </CardTitle>
                <CopyButton getText={() => brief.buyingCommittee.map(p => `${p.title}: ${p.painPoint}`).join("\n")} />
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                  {brief.buyingCommittee.map((person, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <ContactAvatar title={person.title} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{person.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{person.painPoint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pain Points */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />Top Pain Points
                </CardTitle>
                <CopyButton getText={() => brief.topPainPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")} />
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                  {brief.topPainPoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold border border-orange-200 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm flex-1">{point}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent News */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Newspaper className="w-4 h-4 text-purple-500" />Recent News & Triggers
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono gap-1 hidden sm:flex">
                    <Globe className="w-2.5 h-2.5" />live web search
                  </Badge>
                  <CopyButton getText={() => brief.recentNews.join("\n")} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                  {brief.recentNews.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                      <p className="text-sm flex-1">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cold Email */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Mail className="w-4 h-4 text-primary" />Cold Email Opener
                </CardTitle>
                <CopyButton getText={() => brief.suggestedOpeningLine} />
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
    </div>
  );
}