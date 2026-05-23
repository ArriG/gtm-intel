import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2, Star, Users, Newspaper, Mail, Loader2,
  Aperture, Copy, Check, Globe, Zap, Search,
  Trash2, Clock, ChevronDown, MapPin,
  Briefcase, Brain, BookOpen, AlertCircle, ExternalLink, Flag,
  Download, FileText, MessageCircle
} from "lucide-react";
import type { AccountBrief, BriefSource, BuyingCommitteeMember, LinkedInPost, EmailTone, TalkTrack } from "@workspace/api-client-react";
import { EmailTone as EmailToneValues, useCreateIcp, getListIcpsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "wouter";
import { loadHistory, saveToHistory, type HistoryEntry } from "@/lib/history";
import { loadYourCompany, type YourCompany } from "@/lib/your-company";
import { downloadBriefTxt, formatBriefForExport, printBriefPdf } from "@/lib/brief-export";
import { stripCitationTags } from "@/lib/strip-citations";
import { PageHeader } from "@/components/page-header";
import { BriefCard, BriefCardHeader, BriefCardTitle, BriefCardContent, briefCardBodyClass, briefCardLabelClass } from "@/components/brief-card";
import { getValidTriggers } from "@/lib/brief-triggers";
import { domainFromUrl, clearbitLogoUrl } from "@/lib/company-logo";

const TONE_OPTIONS: { value: EmailTone; label: string }[] = [
  { value: EmailToneValues.formal, label: "Formal" },
  { value: EmailToneValues.direct, label: "Direct" },
  { value: EmailToneValues.conversational, label: "Conversational" },
];

// --- Source chip config ---
const SOURCE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  web:            { color: "#185FA5", bg: "#E6F1FB", border: "#85B7EB", label: "Web" },
  linkedin:       { color: "#534AB7", bg: "#EEEDFE", border: "#AFA9EC", label: "LinkedIn" },
  asic:           { color: "#085041", bg: "#E1F5EE", border: "#5DCAA5", label: "ASIC" },
  abn:            { color: "#085041", bg: "#E1F5EE", border: "#5DCAA5", label: "ABN" },
  seek_job:       { color: "#633806", bg: "#FAEEDA", border: "#FAC775", label: "Job ad" },
  crunchbase:     { color: "#7C3AED", bg: "#F3E8FF", border: "#C4B5FD", label: "Crunchbase" },
  industry_press: { color: "#185FA5", bg: "#E6F1FB", border: "#85B7EB", label: "Press" },
  builtwith:      { color: "#633806", bg: "#FAEEDA", border: "#FAC775", label: "Tech stack" },
  g2:             { color: "#791F1F", bg: "#FCEBEB", border: "#F09595", label: "G2" },
  asx_filing:     { color: "#085041", bg: "#E1F5EE", border: "#5DCAA5", label: "ASX" },
  mfaa:           { color: "#085041", bg: "#E1F5EE", border: "#5DCAA5", label: "MFAA" },
  own_intel:      { color: "#085041", bg: "#E1F5EE", border: "#5DCAA5", label: "Your intel" },
  assumed:        { color: "var(--color-text-tertiary)", bg: "var(--color-background-secondary)", border: "var(--color-border-tertiary)", label: "Inferred" },
};

// --- CopyButton ---
function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(getText()); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`gap-1.5 text-xs h-7 px-2 ${copied ? "text-green-600" : "text-muted-foreground hover:text-foreground"}`}>
      {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
    </Button>
  );
}

// --- Source chips ---
function SourceChips({ sources, sectionId }: { sources?: BriefSource[]; sectionId: string }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  const verifiedCount = sources.filter(s => s.confidence === "verified").length;
  const assumedCount = sources.filter(s => s.confidence === "assumed").length;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex gap-1">
          {sources.slice(0, 4).map((s, i) => {
            const cfg = SOURCE_CONFIG[s.type] || SOURCE_CONFIG.web;
            return (
              <span key={i} style={{ background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}` }}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full">{cfg.label}</span>
            );
          })}
          {sources.length > 4 && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{sources.length - 4}</span>}
        </div>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        <span>{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
        {verifiedCount > 0 && <span className="text-green-600 font-medium">· {verifiedCount} verified</span>}
        {assumedCount > 0 && <span className="text-orange-500 font-medium">· {assumedCount} inferred</span>}
      </button>

      {open && (
        <div className="mt-2 bg-muted/30 rounded-lg border border-border overflow-hidden">
          {sources.map((s, i) => {
            const cfg = SOURCE_CONFIG[s.type] || SOURCE_CONFIG.web;
            return (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                <span style={{ background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}` }}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0">{cfg.label}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground mb-0.5">{s.label}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{s.detail}</div>
                  {s.url && s.url.startsWith("http") && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                      <ExternalLink className="w-2.5 h-2.5" />View source
                    </a>
                  )}
                </div>
                <span className={`text-[10px] font-medium flex-shrink-0 mt-0.5 ${
                  s.confidence === "verified" ? "text-green-600" :
                  s.confidence === "informed" ? "text-orange-500" : "text-muted-foreground"
                }`}>{s.confidence}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Score dots ---
function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < score ? score >= 8 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500" : "bg-muted"}`} />
      ))}
      <span className="ml-2 font-bold text-lg tabular-nums">{score}<span className="text-muted-foreground font-normal text-sm">/10</span></span>
    </div>
  );
}

// --- Contact avatar ---
function ContactAvatar({ title }: { title: string }) {
  const initials = title.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{initials}</div>;
}

// --- Confidence badge ---
function ConfidenceBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    high: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-red-100 text-red-700 border-red-200",
  };
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[level] || styles.medium}`}>{level} confidence</span>;
}

// --- Source summary bar ---
function SourceSummaryBar({ summary, triggersFound }: { summary?: AccountBrief["sourceSummary"]; triggersFound?: boolean }) {
  if (!summary) return null;
  const typeConfig = SOURCE_CONFIG;
  const auTypes = ["asic", "abn", "mfaa", "asx_filing"];
  const hasAU = summary.sourceTypes.some(t => auTypes.includes(t));
  return (
    <div className="flex items-center gap-3 flex-wrap px-5 py-3.5 bg-[#F7FAFC] rounded-2xl border border-[#E2E8F0] text-xs text-[#5A677C]">
      <div className="flex items-center gap-1.5 font-medium text-[#2D3748]">
        <BookOpen className="w-3.5 h-3.5 text-primary" />
        {summary.totalSources} sources searched
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {summary.sourceTypes.slice(0, 6).map((t, i) => {
          const cfg = typeConfig[t] || typeConfig.web;
          return <span key={i} style={{ background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}` }}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full">{cfg.label}</span>;
        })}
      </div>
      {hasAU && (
        <div className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
          <MapPin className="w-2.5 h-2.5" />AU sources included
        </div>
      )}
      {triggersFound === false && (
        <div className="flex items-center gap-1 text-[10px] font-medium text-[#5A677C] bg-white px-2 py-0.5 rounded-full border border-[#E2E8F0]">
          No recent triggers found in AU sources
        </div>
      )}
      <div className="ml-auto">
        <ConfidenceBadge level={summary.overallConfidence} />
      </div>
    </div>
  );
}

// --- Autocomplete ---
interface CompanySuggestion { name: string; domain: string; logo: string; }

function CompanySearchInput({ onSearch, loading, cooldownSeconds, initialQuery }: { onSearch: (url: string, label: string) => void; loading: boolean; cooldownSeconds: number; initialQuery?: string; }) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetching, setFetching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query.trim())}`);
        if (res.ok) { const data = await res.json() as CompanySuggestion[]; setSuggestions(data.slice(0, 6)); setShowDropdown(data.length > 0); }
      } catch { setSuggestions([]); } finally { setFetching(false); }
    }, 300);
  }, [query]);

  function handleSelect(s: CompanySuggestion) {
    setQuery(s.name); setShowDropdown(false); setSuggestions([]);
    onSearch(`https://${s.domain}`, s.name);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const url = query.trim().startsWith("http") ? query.trim() : `https://${query.trim()}`;
    onSearch(url, query.trim()); setShowDropdown(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleManualSubmit}>
        <div className="flex gap-2 bg-background border border-border rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <div className="flex items-center pl-2 text-muted-foreground">
            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </div>
          <Input type="text" value={query} onChange={e => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Company name or URL"
            className="flex-1 text-sm border-0 shadow-none focus-visible:ring-0 bg-transparent text-[#2D3748] placeholder:text-[#5A677C]"
            disabled={loading} autoComplete="off" />
          <Button type="submit" disabled={loading || cooldownSeconds > 0 || !query.trim()} className="gap-2 shrink-0 rounded-lg">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Researching...</> : cooldownSeconds > 0 ? <><Clock className="w-4 h-4" />Wait {cooldownSeconds}s</> : <><Zap className="w-4 h-4" />Enrich</>}
          </Button>
        </div>
      </form>
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => handleSelect(s)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border last:border-0">
              {s.logo ? <img src={s.logo} alt="" className="w-6 h-6 rounded object-contain flex-shrink-0" onError={e => (e.currentTarget.style.display = "none")} /> : <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{s.name}</div>
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


// --- Context panels ---
const ROLE_OPTIONS = ["CEO / Founder", "CFO", "CRO / Chief Revenue Officer", "COO", "CMO", "Head of Growth", "Head of RevOps", "Head of Sales", "Head of Operations", "VP Engineering", "Other"];

function ContextPanels({ linkedinPosts, setLinkedinPosts, ownIntel, setOwnIntel }:
  { linkedinPosts: LinkedInPost[]; setLinkedinPosts: (p: LinkedInPost[]) => void; ownIntel: string; setOwnIntel: (s: string) => void; }) {
  const [liOpen, setLiOpen] = useState(false);
  const [ownOpen, setOwnOpen] = useState(false);

  const liCount = linkedinPosts.filter(p => p.content.trim()).length;
  const hasOwn = ownIntel.trim().length > 0;

  function updatePost(i: number, field: keyof LinkedInPost, val: string) {
    const updated = [...linkedinPosts];
    updated[i] = { ...updated[i], [field]: val };
    setLinkedinPosts(updated);
  }

  function addPost() { setLinkedinPosts([...linkedinPosts, { role: "CFO", content: "" }]); }

  function removePost(i: number) { setLinkedinPosts(linkedinPosts.filter((_, idx) => idx !== i)); }

  return (
    <div className="flex flex-col gap-3 mt-3">
      {/* LinkedIn accordion */}
      <BriefCard className="overflow-hidden">
        <button type="button" onClick={() => setLiOpen(!liOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F7FAFC] transition-colors">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2D3748]">
            <span className="text-base text-primary font-bold">in</span>
            LinkedIn signals
            <span className="text-xs font-normal text-[#5A677C]">— paste posts from their leadership</span>
          </div>
          <div className="flex items-center gap-2">
            {liCount > 0 && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">{liCount} added</Badge>}
            <ChevronDown className={`w-4 h-4 text-[#5A677C] transition-transform ${liOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {liOpen && (
          <div className="px-6 pb-5 border-t border-[#E2E8F0] space-y-3">
            {linkedinPosts.map((post, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-1">
                  {post.role.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("")}
                </div>
                <div className="flex-1 space-y-2">
                  <select value={post.role} onChange={e => updatePost(i, "role", e.target.value)}
                    className="text-xs px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-[#2D3748] w-full">
                    {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <textarea value={post.content} onChange={e => updatePost(i, "content", e.target.value)}
                    placeholder="Paste their LinkedIn post here..."
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#2D3748] placeholder:text-[#5A677C] resize-none h-20 leading-relaxed" />
                </div>
                <button type="button" onClick={() => removePost(i)} className="text-[#5A677C] hover:text-destructive mt-1 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addPost} className="text-xs text-[#5A677C] hover:text-[#2D3748] flex items-center gap-1.5 transition-colors">
              <span className="text-base leading-none">+</span>Add another post
            </button>
          </div>
        )}
      </BriefCard>

      {/* Own intel accordion */}
      <BriefCard className="overflow-hidden">
        <button type="button" onClick={() => setOwnOpen(!ownOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F7FAFC] transition-colors">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2D3748]">
            <Brain className="w-4 h-4 text-primary" />
            Your intel
            <span className="text-xs font-normal text-[#5A677C]">— discovery notes, previous interactions, what you know</span>
          </div>
          <div className="flex items-center gap-2">
            {hasOwn && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">Added</Badge>}
            <ChevronDown className={`w-4 h-4 text-[#5A677C] transition-transform ${ownOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {ownOpen && (
          <div className="px-6 pb-5 border-t border-[#E2E8F0]">
            <textarea value={ownIntel} onChange={e => setOwnIntel(e.target.value)}
              placeholder="Add anything you already know — discovery call notes, previous interactions, what they mentioned, who the champion is, budget cycle, failed solutions they've tried..."
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#2D3748] placeholder:text-[#5A677C] resize-none h-28 leading-relaxed" />
            <p className="text-xs text-[#5A677C] mt-2">Private — this context is only used to improve your brief and is never stored or shared.</p>
          </div>
        )}
      </BriefCard>
    </div>
  );
}

function RecentTriggersCard({ items, sources }: { items: NonNullable<AccountBrief["recentTriggers"]>["items"]; sources?: BriefSource[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 3);
  const hiddenCount = items.length - 3;

  return (
    <BriefCard>
      <BriefCardHeader>
        <BriefCardTitle><Newspaper className="w-4 h-4 text-primary" />Recent Triggers & News</BriefCardTitle>
        <CopyButton getText={() => items.map(t => `• ${t.event} — ${t.significance} (${t.recency})`).join("\n")} />
      </BriefCardHeader>
      <BriefCardContent>
        <div className="space-y-3">
          {visible.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#2D3748]">{item.event}</p>
                <p className={`${briefCardBodyClass} mt-0.5`}>{item.significance}</p>
                <p className="text-xs text-[#5A677C]/70 mt-1">{item.recency}</p>
              </div>
            </div>
          ))}
        </div>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="mt-4 text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            {expanded ? <>Show less<ChevronDown className="w-4 h-4 rotate-180" /></> : <>+{hiddenCount} more<ChevronDown className="w-4 h-4" /></>}
          </button>
        )}
        <SourceChips sources={sources} sectionId="triggers" />
      </BriefCardContent>
    </BriefCard>
  );
}

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

function briefActionBody(brief: AccountBrief, companyName: string, linkedinPosts: LinkedInPost[], ownIntel: string) {
  const postsToSend = linkedinPosts.filter(p => p.content.trim());
  return {
    companyName,
    brief,
    linkedinPosts: postsToSend.length > 0 ? postsToSend : undefined,
    ownIntel: ownIntel.trim() || undefined,
    yourCompany: yourCompanyForRequest(loadYourCompany()),
  };
}

function briefToIcpForm(brief: AccountBrief, companyName: string) {
  const triggerItems = brief.recentTriggers?.items ?? [];
  const committee = brief.buyingCommittee ?? [];
  const goals = triggerItems.map(t => t.significance).filter(Boolean);
  return {
    name: companyName,
    industry: brief.companySnapshot?.industry ?? "",
    companySize: brief.companySnapshot?.size ?? "",
    jobTitles: committee.map(p => p.title).join("\n"),
    painPoints: committee.map(p => p.painPoint).join("\n"),
    goals: goals.length > 0 ? goals.join("\n") : (brief.theirWorld?.narrative ?? ""),
    channels: "Email\nLinkedIn",
    notes: `Saved from GTM brief.\n\nICP fit: ${brief.icpFitScore?.score ?? "?"}/10 — ${brief.icpFitScore?.reason ?? ""}`,
  };
}

type IcpFormState = ReturnType<typeof briefToIcpForm>;

function SaveAsIcpDialog({ brief, companyName }: { brief: AccountBrief; companyName: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<IcpFormState>(() => briefToIcpForm(brief, companyName));
  const [savedId, setSavedId] = useState<number | null>(null);
  const mutation = useCreateIcp();
  const queryClient = useQueryClient();

  function handleOpen(nextOpen: boolean) {
    if (nextOpen) {
      setForm(briefToIcpForm(brief, companyName));
      setSavedId(null);
    }
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      data: {
        name: form.name,
        industry: form.industry,
        companySize: form.companySize,
        jobTitles: form.jobTitles.split("\n").map(s => s.trim()).filter(Boolean),
        painPoints: form.painPoints.split("\n").map(s => s.trim()).filter(Boolean),
        goals: form.goals.split("\n").map(s => s.trim()).filter(Boolean),
        channels: form.channels.split("\n").map(s => s.trim()).filter(Boolean),
        notes: form.notes || undefined,
      },
    }, {
      onSuccess: (icp) => {
        queryClient.invalidateQueries({ queryKey: getListIcpsQueryKey() });
        setSavedId(icp.id);
      },
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => handleOpen(true)} className="gap-1.5 text-xs h-7 px-2">
        <Flag className="w-3 h-3" />Save as ICP
      </Button>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Save as ICP Reference</DialogTitle></DialogHeader>
          {savedId ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">ICP saved. Future briefs will be scored against it.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleOpen(false)}>Close</Button>
                <Link href={`/icps/${savedId}`}>
                  <Button>View ICP</Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>ICP Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Industry *</Label>
                  <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Company Size *</Label>
                  <Input value={form.companySize} onChange={e => setForm(f => ({ ...f, companySize: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Job Titles (one per line)</Label>
                <Textarea value={form.jobTitles} onChange={e => setForm(f => ({ ...f, jobTitles: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Pain Points (one per line) *</Label>
                <Textarea value={form.painPoints} onChange={e => setForm(f => ({ ...f, painPoints: e.target.value }))} rows={3} required />
              </div>
              <div className="space-y-1.5">
                <Label>Goals (one per line) *</Label>
                <Textarea value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} rows={3} required />
              </div>
              <div className="space-y-1.5">
                <Label>Channels (one per line) *</Label>
                <Textarea value={form.channels} onChange={e => setForm(f => ({ ...f, channels: e.target.value }))} rows={2} required />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save ICP"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Main page ---
export default function AccountBriefPage() {
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<AccountBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLabel, setLastLabel] = useState("");
  const [lastDomain, setLastDomain] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const [linkedinPosts, setLinkedinPosts] = useState<LinkedInPost[]>([{ role: "CFO", content: "" }]);
  const [ownIntel, setOwnIntel] = useState("");
  const [showFullEmail, setShowFullEmail] = useState(false);
  const [emailTone, setEmailTone] = useState<EmailTone>(EmailToneValues.direct);
  const [emailRegenerating, setEmailRegenerating] = useState(false);
  const [talkTrack, setTalkTrack] = useState<TalkTrack | null>(null);
  const [talkTrackLoading, setTalkTrackLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const historyParam = searchParams.get("h");
  const queryParam = searchParams.get("q");

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => setCooldownSeconds(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (!historyParam) return;
    const entry = loadHistory().find(h => h.id === historyParam);
    if (entry) handleHistorySelect(entry);
  }, [historyParam]);

  async function handleSearch(url: string, label: string) {
    setLoading(true); setError(null); setBrief(null); setLastLabel(label); setLastDomain(domainFromUrl(url)); setLogoFailed(false); setShowFullEmail(false);
    setTalkTrack(null);
    if (historyParam || queryParam) setSearchParams(new URLSearchParams());
    const postsToSend = linkedinPosts.filter(p => p.content.trim());
    const yourCompany = yourCompanyForRequest(loadYourCompany());
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/account-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          linkedinPosts: postsToSend.length > 0 ? postsToSend : undefined,
          ownIntel: ownIntel.trim() || undefined,
          yourCompany,
          emailTone,
        }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error((body as { error?: string }).error || `Request failed (${res.status})`); }
      const data = await res.json() as AccountBrief;
      setBrief(data);
      saveToHistory({ id: Date.now().toString(), label, url, icpScore: data.icpFitScore?.score ?? 0, savedAt: new Date().toISOString(), brief: data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); setCooldownSeconds(30); }
  }

  function handleHistorySelect(entry: HistoryEntry) {
    setLastLabel(entry.label); setLastDomain(domainFromUrl(entry.url)); setLogoFailed(false); setBrief(entry.brief); setError(null); setTalkTrack(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function regenerateColdEmail(tone: EmailTone) {
    if (!brief) return;
    setEmailTone(tone);
    setEmailRegenerating(true);
    setError(null);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/account-brief/cold-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...briefActionBody(brief, lastLabel, linkedinPosts, ownIntel), emailTone: tone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
      }
      const coldEmail = await res.json();
      setBrief({ ...brief, coldEmail });
      setShowFullEmail(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate email.");
    } finally {
      setEmailRegenerating(false);
    }
  }

  async function generateTalkTrack() {
    if (!brief) return;
    setTalkTrackLoading(true);
    setError(null);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/account-brief/talk-track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(briefActionBody(brief, lastLabel, linkedinPosts, ownIntel)),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
      }
      setTalkTrack(await res.json() as TalkTrack);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate talk track.");
    } finally {
      setTalkTrackLoading(false);
    }
  }

  const exportText = () => brief ? formatBriefForExport(brief, lastLabel, talkTrack) : "";

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="border-b border-border bg-gradient-to-br from-background via-background to-primary/5 px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <Aperture className="w-6 h-6 text-primary mb-4" />
          <PageHeader
            title="Search Companies"
            subtitle="Sourced GTM brief with 5 source types - AU Aware"
            subtitleClassName="mb-6"
          />
          <CompanySearchInput onSearch={handleSearch} loading={loading} cooldownSeconds={cooldownSeconds} initialQuery={queryParam ?? undefined} />
          {!brief && (
            <ContextPanels linkedinPosts={linkedinPosts} setLinkedinPosts={setLinkedinPosts} ownIntel={ownIntel} setOwnIntel={setOwnIntel} />
          )}
          {loading && <p className="text-xs text-muted-foreground mt-3 font-mono flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Searching across 5 source types including ASIC, Seek, LinkedIn, and AU press — 30–60 seconds...</p>}
        </div>
      </div>

      {/* Results */}
      <div className="px-8 py-8 max-w-5xl mx-auto space-y-4">
        {error && <Card className="border-destructive bg-destructive/5"><CardContent className="p-4 text-sm text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</CardContent></Card>}
        {loading && !brief && <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>}

        {brief && (() => {
          const validTriggers = getValidTriggers(brief.recentTriggers?.items);
          const hasTriggers = validTriggers.length > 0;
          const companyLogo = lastDomain ? clearbitLogoUrl(lastDomain) : "";

          return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Company header + actions */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {companyLogo && !logoFailed ? (
                  <img
                    src={companyLogo}
                    alt=""
                    className="w-14 h-14 rounded-2xl border border-[#E2E8F0] object-contain bg-white p-1.5 shrink-0"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl border border-[#E2E8F0] bg-[#F7FAFC] flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-primary">Brief for</p>
                  <h2 className="text-3xl font-bold tracking-tight leading-[1.15] text-[#2D3748]">{lastLabel}</h2>
                  <p className="text-base text-[#5A677C] mt-1">{brief.companySnapshot.industry} · {brief.companySnapshot.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                <Button variant="outline" size="sm" onClick={() => downloadBriefTxt(exportText(), lastLabel)} className="gap-1.5 text-xs h-8 px-3 rounded-xl border-[#E2E8F0]">
                  <Download className="w-3 h-3" />Download
                </Button>
                <Button variant="outline" size="sm" onClick={() => printBriefPdf(brief, lastLabel, talkTrack)} className="gap-1.5 text-xs h-8 px-3 rounded-xl border-[#E2E8F0]">
                  <FileText className="w-3 h-3" />PDF
                </Button>
                <SaveAsIcpDialog brief={brief} companyName={lastLabel} />
                <CopyButton getText={() => exportText()} />
              </div>
            </div>

            <SourceSummaryBar summary={brief.sourceSummary} triggersFound={hasTriggers} />

            {/* Top row: Snapshot · ICP · Triggers (optional) */}
            <div className={hasTriggers
              ? "grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-4"
              : "grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4"
            }>
              <BriefCard>
                <BriefCardHeader>
                  <BriefCardTitle><Building2 className="w-4 h-4 text-primary" />Company Snapshot</BriefCardTitle>
                  <CopyButton getText={() => `${brief.companySnapshot.size} | ${brief.companySnapshot.industry} | ${brief.companySnapshot.location} | ${brief.companySnapshot.fundingStage}`} />
                </BriefCardHeader>
                <BriefCardContent>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[{ label: "Size", value: brief.companySnapshot.size }, { label: "Industry", value: brief.companySnapshot.industry }, { label: "Location", value: brief.companySnapshot.location }, { label: "Stage", value: brief.companySnapshot.fundingStage }]
                      .map(({ label, value }) => (
                        <div key={label} className="px-4 py-3 rounded-xl bg-[#F7FAFC] border border-[#E2E8F0]">
                          <p className={`${briefCardLabelClass} mb-1`}>{label}</p>
                          <p className="font-semibold text-sm text-[#2D3748]">{value}</p>
                        </div>
                      ))}
                  </div>
                  {(brief.companySnapshot.abn || brief.companySnapshot.techStack) && (
                    <div className="flex gap-4 flex-wrap mb-1">
                      {brief.companySnapshot.abn && brief.companySnapshot.abn !== "Not found" && (
                        <div className="flex items-center gap-1.5 text-xs text-[#5A677C]"><MapPin className="w-3 h-3 text-primary" /><span>ABN:</span><span className="font-medium text-[#2D3748]">{brief.companySnapshot.abn}</span></div>
                      )}
                      {brief.companySnapshot.techStack && brief.companySnapshot.techStack !== "Not detected" && (
                        <div className="flex items-center gap-1.5 text-xs text-[#5A677C]"><Briefcase className="w-3 h-3 text-primary" /><span>Tech:</span><span className="font-medium text-[#2D3748]">{brief.companySnapshot.techStack}</span></div>
                      )}
                    </div>
                  )}
                  <SourceChips sources={brief.companySnapshot.sources} sectionId="snapshot" />
                </BriefCardContent>
              </BriefCard>

              <BriefCard>
                <BriefCardHeader>
                  <BriefCardTitle><Star className="w-4 h-4 text-yellow-500" />ICP Fit Score</BriefCardTitle>
                  <CopyButton getText={() => `ICP Score: ${brief.icpFitScore.score}/10 — ${brief.icpFitScore.reason}`} />
                </BriefCardHeader>
                <BriefCardContent className="space-y-2">
                  <ScoreDots score={brief.icpFitScore.score} />
                  <p className={briefCardBodyClass}>{brief.icpFitScore.reason}</p>
                  <SourceChips sources={brief.icpFitScore.sources} sectionId="icp" />
                </BriefCardContent>
              </BriefCard>

              {hasTriggers && (
                <RecentTriggersCard items={validTriggers} sources={brief.recentTriggers?.sources} />
              )}
            </div>

            <BriefCard>
              <BriefCardHeader>
                <BriefCardTitle>
                  <Globe className="w-4 h-4 text-primary" />What's Going On In Their World
                  {brief.theirWorld?.confidence && <ConfidenceBadge level={brief.theirWorld.confidence} />}
                </BriefCardTitle>
                <CopyButton getText={() => brief.theirWorld.narrative} />
              </BriefCardHeader>
              <BriefCardContent>
                <p className="text-sm text-[#2D3748] leading-relaxed">{stripCitationTags(brief.theirWorld?.narrative ?? "")}</p>
                <SourceChips sources={brief.theirWorld?.sources} sectionId="world" />
              </BriefCardContent>
            </BriefCard>

            <BriefCard>
              <BriefCardHeader>
                <BriefCardTitle><Users className="w-4 h-4 text-primary" />Likely Buying Committee</BriefCardTitle>
                <CopyButton getText={() => (brief.buyingCommittee ?? []).map(p => `${p.title}: ${p.painPoint}`).join("\n")} />
              </BriefCardHeader>
              <BriefCardContent>
                <div className="space-y-3">
                  {(brief.buyingCommittee ?? []).map((person, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-[#F7FAFC] border border-[#E2E8F0]">
                      <ContactAvatar title={person.title} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#2D3748]">{person.title}</p>
                        <p className={`${briefCardBodyClass} mt-0.5`}>{person.painPoint}</p>
                        {person.linkedinSignal && (
                          <p className="text-xs text-primary mt-1.5 flex items-start gap-1.5 italic">
                            <span className="font-bold not-italic">in</span>"{person.linkedinSignal}"
                          </p>
                        )}
                        <SourceChips sources={person.sources} sectionId={`person-${i}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </BriefCardContent>
            </BriefCard>

            <BriefCard className="border-primary/20">
              <BriefCardHeader>
                <BriefCardTitle><Mail className="w-4 h-4 text-primary" />Cold Email</BriefCardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowFullEmail(!showFullEmail)} className="text-xs h-7 px-2 text-[#5A677C]">
                    {showFullEmail ? "Show opener" : "Show full email"}
                  </Button>
                  <CopyButton getText={() => showFullEmail && brief.coldEmail.fullEmail ? brief.coldEmail.fullEmail : brief.coldEmail.opener} />
                </div>
              </BriefCardHeader>
              <BriefCardContent className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`${briefCardLabelClass}`}>Tone:</span>
                  {TONE_OPTIONS.map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={emailTone === value ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7 px-2.5 rounded-xl"
                      disabled={emailRegenerating}
                      onClick={() => regenerateColdEmail(value)}
                    >
                      {emailRegenerating && emailTone === value ? <Loader2 className="w-3 h-3 animate-spin" /> : label}
                    </Button>
                  ))}
                </div>
                {showFullEmail && brief.coldEmail.fullEmail
                  ? <pre className="text-sm text-[#2D3748] leading-relaxed whitespace-pre-wrap font-sans">{stripCitationTags(brief.coldEmail.fullEmail)}</pre>
                  : <blockquote className="border-l-4 border-primary pl-4 italic text-sm text-[#2D3748] leading-relaxed">"{stripCitationTags(brief.coldEmail.opener)}"</blockquote>}
                <SourceChips sources={brief.coldEmail.sources} sectionId="email" />
              </BriefCardContent>
            </BriefCard>

            <BriefCard>
              <BriefCardHeader>
                <BriefCardTitle><MessageCircle className="w-4 h-4 text-primary" />Discovery Talk Track</BriefCardTitle>
                {!talkTrack && (
                  <Button variant="outline" size="sm" onClick={generateTalkTrack} disabled={talkTrackLoading} className="text-xs h-7 gap-1.5 rounded-xl border-[#E2E8F0]">
                    {talkTrackLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Generating...</> : "Generate questions"}
                  </Button>
                )}
              </BriefCardHeader>
              <BriefCardContent>
                {!talkTrack && !talkTrackLoading && (
                  <p className={briefCardBodyClass}>One click to get a call opener and discovery questions tailored to this brief and Your Company.</p>
                )}
                {talkTrackLoading && <Skeleton className="h-24 w-full rounded-xl" />}
                {talkTrack && (
                  <div className="space-y-4">
                    <div>
                      <p className={`${briefCardLabelClass} mb-1.5`}>Opening</p>
                      <p className="text-sm text-[#2D3748] leading-relaxed">{talkTrack.opening}</p>
                    </div>
                    <div>
                      <p className={`${briefCardLabelClass} mb-2`}>Discovery Questions</p>
                      <ol className="space-y-2 list-decimal list-inside">
                        {talkTrack.discoveryQuestions.map((q, i) => (
                          <li key={i} className="text-sm text-[#2D3748] leading-relaxed">{q}</li>
                        ))}
                      </ol>
                    </div>
                    <CopyButton getText={() => `${talkTrack.opening}\n\n${talkTrack.discoveryQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`} />
                  </div>
                )}
              </BriefCardContent>
            </BriefCard>

            <ContextPanels linkedinPosts={linkedinPosts} setLinkedinPosts={setLinkedinPosts} ownIntel={ownIntel} setOwnIntel={setOwnIntel} />
          </div>
          );
        })()}
      </div>
    </div>
  );
}