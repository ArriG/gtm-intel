import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2, Star, Users, Newspaper, Mail, Loader2,
  Copy, Check, Globe, Zap, Search,
  Trash2, Clock, ChevronDown, MapPin,
  Brain, BookOpen, AlertCircle, ExternalLink, Flag,
  Download, FileText, MessageCircle, ClipboardList, ArrowRight, Phone, HelpCircle, Compass
} from "lucide-react";
import type { AccountBrief, AccountMapResponse, BriefSource, BuyingCommitteeMember, LinkedInPost, EmailTone, TalkTrack } from "@workspace/api-client-react";
import { EmailTone as EmailToneValues, generateAccountMap, useCreateIcp, getListIcpsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "wouter";
import { loadHistory, saveToHistory, updateHistoryEntry, getHistoryEntry, type HistoryEntry } from "@/lib/history";
import type { BriefStatus } from "@/lib/brief-status";
import { BriefStatusSelect } from "@/components/brief-status-select";
import { NextTouchSection } from "@/components/next-touch-section";
import { loadYourCompany, yourCompanyForRequest, useIsYourCompanyConfigured, useYourCompany, researchHeroSubtitle, isYourCompanyConfigured } from "@/lib/your-company";
import { researchLoadingMessage } from "@/lib/research-loading";
import { mappingLoadingMessage } from "@/lib/mapping-loading-messages";
import { AccountMapResult } from "@/components/account-map/account-map-result";
import { SearchModeToggle, type SearchMode } from "@/components/search-mode-toggle";
import { RegionSelect } from "@/components/region-select";
import { defaultRegionFromGeographies, type MapRegion } from "@/lib/map-region";
import { saveBriefSession, loadBriefSession, clearBriefSession } from "@/lib/brief-session";
import { saveMapSession, loadMapSession, clearMapSession } from "@/lib/map-session";
import { downloadBriefTxt, formatBriefForExport, printBriefPdf } from "@/lib/brief-export";
import { stripCitationTags } from "@/lib/strip-citations";
import { BriefCard, BriefCardHeader, BriefCardTitle, BriefCardContent, briefCardBodyClass, briefCardLabelClass } from "@/components/brief-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  buyerDisplayName,
  callPriorityLabel,
  callPriorityStyles,
  fitHighlights,
  MAX_BUYERS,
  snapshotPainPoints,
  worldBullets,
} from "@/lib/brief-helpers";
import { getValidTriggers } from "@/lib/brief-triggers";
import { domainFromUrl, clearbitLogoUrl } from "@/lib/company-logo";
import { BearMark } from "@/components/bear-mark";
import { savePrepContext } from "@/lib/call-prep-context";

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

function ConfidencePill({ level }: { level?: string }) {
  if (!level) return null;
  const styles: Record<string, string> = {
    verified: "text-green-700 bg-green-50 border-green-200",
    informed: "text-amber-700 bg-amber-50 border-amber-200",
    assumed: "text-muted-foreground bg-muted border-border",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[level] ?? styles.informed}`}>
      {level}
    </span>
  );
}

function CallDecisionCard({ brief }: { brief: AccountBrief }) {
  const decision = brief.callDecision;
  if (!decision) return null;
  const styles = callPriorityStyles(decision.priority);

  return (
    <BriefCard className={`${styles.bg} ${styles.border}`}>
      <BriefCardContent className="pt-5 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/80 border border-border flex items-center justify-center shrink-0">
            <Phone className={`w-4 h-4 ${styles.text}`} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-xs font-bold uppercase tracking-widest ${styles.text}`}>Call decision</p>
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${styles.badge}`}>
                {callPriorityLabel(decision.priority)}
              </span>
            </div>
            <p className="text-sm sm:text-base font-medium text-foreground leading-snug">{decision.justification}</p>
            <SourceChips sources={decision.sources} sectionId="call-decision" />
          </div>
          <CopyButton getText={() => `${callPriorityLabel(decision.priority)}: ${decision.justification}`} />
        </div>
      </BriefCardContent>
    </BriefCard>
  );
}

function isBlankText(value: string | null | undefined): boolean {
  return !value?.trim();
}

function ColdEmailMissingWarning({ kind }: { kind: "opener" | "fullEmail" }) {
  const message = kind === "fullEmail"
    ? "Full cold email not generated for this account — try regenerating, or check the call decision above."
    : "Cold email opener not generated for this account — try regenerating, or check the call decision above.";

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-start gap-2.5">
      <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
    </div>
  );
}

function OpenerCard({ brief }: { brief: AccountBrief }) {
  const opener = stripCitationTags(brief.coldEmail.opener);
  const openerMissing = isBlankText(opener);

  return (
    <BriefCard className="bg-primary/[0.04] border-primary/30">
      <BriefCardHeader>
        <BriefCardTitle><Mail className="w-4 h-4 text-primary" />Opener</BriefCardTitle>
        {!openerMissing && <CopyButton getText={() => opener} />}
      </BriefCardHeader>
      <BriefCardContent>
        {openerMissing ? (
          <ColdEmailMissingWarning kind="opener" />
        ) : (
          <blockquote className="border-l-4 border-primary pl-4 italic text-sm sm:text-base text-foreground leading-relaxed">
            "{opener}"
          </blockquote>
        )}
        <SourceChips sources={brief.coldEmail.sources} sectionId="email-opener" />
      </BriefCardContent>
    </BriefCard>
  );
}

function WhyNowCard({ items, sources }: { items: NonNullable<AccountBrief["recentTriggers"]>["items"]; sources?: BriefSource[] }) {
  return (
    <BriefCard>
      <BriefCardHeader>
        <BriefCardTitle><Newspaper className="w-4 h-4 text-primary" />Why now</BriefCardTitle>
        {items.length > 0 && (
          <CopyButton getText={() => items.map(t => `• ${t.event} — ${t.significance} (${t.recency})`).join("\n")} />
        )}
      </BriefCardHeader>
      <BriefCardContent>
        {items.length === 0 ? (
          <p className={briefCardBodyClass}>No recent triggers found — call decision is based on structural fit or hiring signals only.</p>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 2).map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.event}</p>
                  <p className={`${briefCardBodyClass} mt-0.5`}>{item.significance}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{item.recency}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <SourceChips sources={sources} sectionId="triggers" />
      </BriefCardContent>
    </BriefCard>
  );
}

function BuyersCard({ committee }: { committee: BuyingCommitteeMember[] }) {
  if (committee.length === 0) return null;

  return (
    <BriefCard>
      <BriefCardHeader>
        <BriefCardTitle><Users className="w-4 h-4 text-primary" />Who to call</BriefCardTitle>
        <CopyButton getText={() => committee.slice(0, MAX_BUYERS).map(p => `${buyerDisplayName(p)}: ${p.painPoint}`).join("\n")} />
      </BriefCardHeader>
      <BriefCardContent>
        <div className="space-y-3">
          {committee.slice(0, MAX_BUYERS).map((person, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-secondary border border-border">
              <ContactAvatar title={person.name?.trim() || person.title} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{buyerDisplayName(person)}</p>
                <p className={`${briefCardBodyClass} mt-0.5`}>{person.painPoint}</p>
                {person.linkedinSignal ? (
                  <p className="text-xs text-primary mt-1.5 flex items-start gap-1.5 italic">
                    <span className="font-bold not-italic">in</span>"{person.linkedinSignal}"
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1.5">No public LinkedIn signal found</p>
                )}
                <SourceChips sources={person.sources} sectionId={`person-${i}`} />
              </div>
            </div>
          ))}
        </div>
      </BriefCardContent>
    </BriefCard>
  );
}

function DiscoveryQuestionsCard({ questions }: { questions: NonNullable<AccountBrief["discoveryQuestions"]> }) {
  if (!questions.length) return null;

  return (
    <BriefCard>
      <BriefCardHeader>
        <BriefCardTitle><HelpCircle className="w-4 h-4 text-primary" />Questions to ask</BriefCardTitle>
        <CopyButton getText={() => questions.map(q => `• ${q.question}`).join("\n")} />
      </BriefCardHeader>
      <BriefCardContent className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl border border-border bg-secondary/60 p-4">
            <p className="text-sm text-foreground leading-snug">{q.question}</p>
            {q.tiedToSignal && (
              <p className="text-xs text-muted-foreground mt-2">
                <span className="font-medium text-foreground/70">Re:</span> {q.tiedToSignal}
              </p>
            )}
            <div className="mt-2">
              <ConfidencePill level={q.confidence} />
            </div>
          </div>
        ))}
      </BriefCardContent>
    </BriefCard>
  );
}

function ManualResearchTipsCard({ tips }: { tips: NonNullable<AccountBrief["manualResearchTips"]> }) {
  if (!tips.length) return null;

  return (
    <BriefCard>
      <BriefCardHeader>
        <BriefCardTitle><Compass className="w-4 h-4 text-primary" />Check manually before calling</BriefCardTitle>
        <CopyButton getText={() => tips.map(t => `• ${t.tip}`).join("\n")} />
      </BriefCardHeader>
      <BriefCardContent>
        <BriefBulletList items={tips.map(t => t.reason ? `${t.tip} — ${t.reason}` : t.tip)} />
      </BriefCardContent>
    </BriefCard>
  );
}

function BackgroundSection({
  brief,
  hasTriggers,
  validTriggers,
  showFullEmail,
  setShowFullEmail,
  emailTone,
  emailRegenerating,
  regenerateColdEmail,
}: {
  brief: AccountBrief;
  hasTriggers: boolean;
  validTriggers: NonNullable<AccountBrief["recentTriggers"]>["items"];
  showFullEmail: boolean;
  setShowFullEmail: (value: boolean) => void;
  emailTone: EmailTone;
  emailRegenerating: boolean;
  regenerateColdEmail: (tone: EmailTone) => void;
}) {
  return (
    <Collapsible defaultOpen={false}>
      <BriefCard>
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full text-left px-6 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors rounded-2xl">
            <div>
              <p className="text-sm font-bold text-foreground">Background & sources</p>
              <p className="text-xs text-muted-foreground mt-0.5">Account fit, full email, and source audit</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
            <SourceSummaryBar summary={brief.sourceSummary} triggersFound={hasTriggers} />

            <div className="grid grid-cols-1 gap-4">
              <BriefCard>
                <BriefCardHeader>
                  <BriefCardTitle><Star className="w-4 h-4 text-yellow-500" />Account Fit</BriefCardTitle>
                </BriefCardHeader>
                <BriefCardContent className="space-y-2">
                  <IcpScoreDisplay score={brief.icpFitScore.score} highlights={fitHighlights(brief)} />
                  <SourceChips sources={brief.icpFitScore.sources} sectionId="icp" />
                </BriefCardContent>
              </BriefCard>
            </div>

            <BriefCard>
              <BriefCardHeader>
                <BriefCardTitle>
                  <Globe className="w-4 h-4 text-primary" />Their world
                  {brief.theirWorld?.confidence && <ConfidenceBadge level={brief.theirWorld.confidence} />}
                </BriefCardTitle>
              </BriefCardHeader>
              <BriefCardContent>
                <BriefBulletList items={worldBullets(brief)} />
                <SourceChips sources={brief.theirWorld?.sources} sectionId="world" />
              </BriefCardContent>
            </BriefCard>

            <BriefCard className="bg-primary/[0.04] border-primary/30">
              <BriefCardHeader>
                <BriefCardTitle><Mail className="w-4 h-4 text-primary" />Full cold email</BriefCardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowFullEmail(!showFullEmail)} className="text-xs h-7 px-2 text-muted-foreground">
                    {showFullEmail ? "Show opener only" : "Show full email"}
                  </Button>
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
                {showFullEmail ? (
                  isBlankText(stripCitationTags(brief.coldEmail.fullEmail ?? ""))
                    ? <ColdEmailMissingWarning kind="fullEmail" />
                    : <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">{stripCitationTags(brief.coldEmail.fullEmail ?? "")}</pre>
                ) : isBlankText(stripCitationTags(brief.coldEmail.opener)) ? (
                  <ColdEmailMissingWarning kind="opener" />
                ) : (
                  <blockquote className="border-l-4 border-primary pl-4 italic text-sm text-foreground leading-relaxed">"{stripCitationTags(brief.coldEmail.opener)}"</blockquote>
                )}
                <SourceChips sources={brief.coldEmail.sources} sectionId="email-full" />
              </BriefCardContent>
            </BriefCard>
          </div>
        </CollapsibleContent>
      </BriefCard>
    </Collapsible>
  );
}

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

function BriefBulletList({ items, className }: { items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={`space-y-1.5 ${className ?? ""}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-snug">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// --- Contact avatar ---
function CompanySnapshotCard({ brief }: { brief: AccountBrief }) {
  const snap = brief.companySnapshot;
  const tech = snap.techStack?.trim();
  const showTech = tech && tech !== "Not detected";
  const pains = snapshotPainPoints(brief);
  const hasPains = pains.length > 0;

  return (
    <BriefCard>
      <BriefCardHeader>
        <BriefCardTitle><Globe className="w-4 h-4 text-primary" />Company snapshot</BriefCardTitle>
        <CopyButton getText={() => {
          const meta = [snap.size, snap.industry, snap.location, snap.fundingStage].filter(Boolean).join(" · ");
          const painLines = pains.map(p => `• ${p}`).join("\n");
          return painLines ? `${meta}\n\nPossible pain points:\n${painLines}` : meta;
        }} />
      </BriefCardHeader>
      <BriefCardContent>
        <div className={`grid gap-5 ${hasPains ? "grid-cols-1 sm:grid-cols-2 sm:gap-6" : "grid-cols-1"}`}>
          <div className="space-y-3 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Profile</p>
            <p className="text-sm text-foreground leading-snug">
              {[snap.size, snap.industry, snap.location, snap.fundingStage].filter(Boolean).join(" · ")}
            </p>
            {showTech && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Tech stack</p>
                <p className="text-sm font-medium text-foreground leading-snug">{tech}</p>
              </div>
            )}
          </div>

          {hasPains && (
            <div className="min-w-0 rounded-xl border border-border bg-secondary/50 p-4 sm:py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Possible pain points</p>
              <ul className="space-y-2">
                {pains.map((pain, i) => (
                  <li key={i} className="text-sm text-foreground leading-snug pl-3 border-l-2 border-primary/40">
                    {pain}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <SourceChips sources={snap.sources} sectionId="snapshot" />
      </BriefCardContent>
    </BriefCard>
  );
}

// --- ICP score display ---
function icpScoreBand(score: number) {
  if (score >= 8) return { label: "Strong fit", text: "text-green-600", badge: "bg-green-50 text-green-700 border-green-200", fill: "bg-green-500" };
  if (score >= 5) return { label: "Moderate fit", text: "text-yellow-600", badge: "bg-yellow-50 text-yellow-700 border-yellow-200", fill: "bg-yellow-500" };
  return { label: "Weak fit", text: "text-red-600", badge: "bg-red-50 text-red-700 border-red-200", fill: "bg-red-500" };
}

function IcpScoreDisplay({ score, highlights }: { score: number; highlights: string[] }) {
  const band = icpScoreBand(score);
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="flex items-end gap-1">
          <span className={`text-3xl font-black tabular-nums leading-none ${band.text}`}>{score}</span>
          <span className="text-sm text-muted-foreground pb-0.5">/10</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${band.badge}`}>
          {band.label}
        </span>
      </div>
      <BriefBulletList items={highlights} />
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
    <div className="flex items-center gap-3 flex-wrap px-5 py-3.5 bg-secondary rounded-2xl border border-border text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5 font-medium text-foreground">
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
        <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-white px-2 py-0.5 rounded-full border border-border">
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

function CompanySearchInput({
  query,
  onQueryChange,
  onSearch,
  loading,
  loadingLabel = "Researching...",
  cooldownSeconds,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (url: string, label: string) => void;
  loading: boolean;
  loadingLabel?: string;
  cooldownSeconds: number;
}) {
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetching, setFetching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownLockedRef = useRef(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (loading) {
      dropdownLockedRef.current = true;
      setShowDropdown(false);
      setSuggestions([]);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [loading]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (dropdownLockedRef.current || loading) return;
    if (query.trim().length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json() as CompanySuggestion[];
          if (!dropdownLockedRef.current) {
            setSuggestions(data.slice(0, 6));
            setShowDropdown(data.length > 0);
          }
        }
      } catch { setSuggestions([]); } finally { setFetching(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, loading]);

  function handleSelect(s: CompanySuggestion) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    dropdownLockedRef.current = true;
    onQueryChange(s.name);
    setShowDropdown(false);
    setSuggestions([]);
    onSearch(`https://${s.domain}`, s.name);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    dropdownLockedRef.current = true;
    const url = query.trim().startsWith("http") ? query.trim() : `https://${query.trim()}`;
    onSearch(url, query.trim());
    setShowDropdown(false);
    setSuggestions([]);
  }

  function handleQueryChange(value: string) {
    dropdownLockedRef.current = false;
    onQueryChange(value);
  }

  return (
    <div ref={wrapperRef} className="relative z-50">
      <form onSubmit={handleManualSubmit}>
        <div className="flex gap-2 bg-card border-2 border-foreground/10 rounded-2xl p-2 focus-within:border-foreground/25 transition-all">
          <div className="flex items-center pl-2 text-muted-foreground">
            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </div>
          <Input type="text" value={query} onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => { if (!dropdownLockedRef.current && suggestions.length > 0) setShowDropdown(true); }}
            placeholder="Company name or URL"
            className="flex-1 text-sm font-medium border-0 shadow-none focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground"
            disabled={loading} autoComplete="off" />
          <Button
            type="submit"
            disabled={loading || cooldownSeconds > 0 || !query.trim()}
            className="gap-2 shrink-0 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold border-0 min-h-10 px-5"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{loadingLabel}</> : cooldownSeconds > 0 ? <><Clock className="w-4 h-4" />Wait {cooldownSeconds}s</> : <><Zap className="w-4 h-4" />Enrich</>}
          </Button>
        </div>
      </form>
      {showDropdown && !loading && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
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
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary transition-colors">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="text-base text-primary font-bold">in</span>
            LinkedIn signals
            <span className="text-xs font-normal text-muted-foreground">— paste posts from their leadership</span>
          </div>
          <div className="flex items-center gap-2">
            {liCount > 0 && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">{liCount} added</Badge>}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${liOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {liOpen && (
          <div className="px-6 pb-5 border-t border-border space-y-3">
            {linkedinPosts.map((post, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-1">
                  {post.role.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("")}
                </div>
                <div className="flex-1 space-y-2">
                  <select value={post.role} onChange={e => updatePost(i, "role", e.target.value)}
                    className="text-xs px-3 py-2 rounded-xl border border-border bg-white text-foreground w-full">
                    {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <textarea value={post.content} onChange={e => updatePost(i, "content", e.target.value)}
                    placeholder="Paste their LinkedIn post here..."
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground resize-none h-20 leading-relaxed" />
                </div>
                <button type="button" onClick={() => removePost(i)} className="text-muted-foreground hover:text-destructive mt-1 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addPost} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
              <span className="text-base leading-none">+</span>Add another post
            </button>
          </div>
        )}
      </BriefCard>

      {/* Own intel accordion */}
      <BriefCard className="overflow-hidden">
        <button type="button" onClick={() => setOwnOpen(!ownOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary transition-colors">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Brain className="w-4 h-4 text-primary" />
            Your intel
            <span className="text-xs font-normal text-muted-foreground">— discovery notes, previous interactions, what you know</span>
          </div>
          <div className="flex items-center gap-2">
            {hasOwn && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">Added</Badge>}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${ownOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {ownOpen && (
          <div className="px-6 pb-5 border-t border-border">
            <textarea value={ownIntel} onChange={e => setOwnIntel(e.target.value)}
              placeholder="Add anything you already know — discovery call notes, previous interactions, what they mentioned, who the champion is, budget cycle, failed solutions they've tried..."
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-border bg-white text-foreground placeholder:text-muted-foreground resize-none h-28 leading-relaxed" />
            <p className="text-xs text-muted-foreground mt-2">Private — this context is only used to improve your brief and is never stored or shared.</p>
          </div>
        )}
      </BriefCard>
    </div>
  );
}

function BriefSetupRequired() {
  return (
    <div className="min-h-screen">
      <div className="bg-primary text-foreground px-8 py-14 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <BearMark size={52} className="mb-6" />
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Set up Your Company first
          </h1>
          <p className="mt-4 text-lg font-medium text-foreground/85 leading-snug max-w-2xl">
            Before we research an account, GTM Intel needs to know what you sell, who you serve, and where you play. That context shapes every brief, email, and fit score.
          </p>
        </div>
      </div>
      <div className="bg-secondary px-8 py-10 sm:py-12">
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            It takes about two minutes. Once saved, Search unlocks and research sources adapt to your market automatically.
          </p>
          <Link href="/your-company">
            <Button className="gap-1.5">
              Set up Your Company
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
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
  const companyConfigured = useIsYourCompanyConfigured();
  const yourCompany = useYourCompany();
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<AccountBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLabel, setLastLabel] = useState("");
  const [lastUrl, setLastUrl] = useState("");
  const [lastDomain, setLastDomain] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const [linkedinPosts, setLinkedinPosts] = useState<LinkedInPost[]>([{ role: "CFO", content: "" }]);
  const [ownIntel, setOwnIntel] = useState("");
  const [showFullEmail, setShowFullEmail] = useState(false);
  const [emailTone, setEmailTone] = useState<EmailTone>(EmailToneValues.direct);
  const [emailRegenerating, setEmailRegenerating] = useState(false);
  const [talkTrack, setTalkTrack] = useState<TalkTrack | null>(null);
  const [talkTrackLoading, setTalkTrackLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showOptionalContext, setShowOptionalContext] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [briefStatus, setBriefStatus] = useState<BriefStatus>("not_contacted");
  const [watchingSignals, setWatchingSignals] = useState(true);
  const [searchMode, setSearchMode] = useState<SearchMode>("mapping");
  const [mapLoading, setMapLoading] = useState(false);
  const [mapLoadingSeconds, setMapLoadingSeconds] = useState(0);
  const [accountMap, setAccountMap] = useState<AccountMapResponse | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion>(() =>
    defaultRegionFromGeographies(loadYourCompany()?.geographies),
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const historyParam = searchParams.get("h");
  const queryParam = searchParams.get("q");

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => setCooldownSeconds(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (!mapLoading) {
      setMapLoadingSeconds(0);
      return;
    }
    const id = setInterval(() => setMapLoadingSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [mapLoading]);

  useEffect(() => {
    if (!currentHistoryId) {
      setBriefStatus("not_contacted");
      return;
    }
    const entry = getHistoryEntry(currentHistoryId);
    setBriefStatus(entry?.status ?? "not_contacted");
  }, [currentHistoryId, brief]);

  useEffect(() => {
    if (historyParam) return;
    if (queryParam) {
      setSearchQuery(queryParam);
      return;
    }
    const session = loadBriefSession();
    if (session) {
      setSearchMode("brief");
      setLastLabel(session.label);
      setLastUrl(session.url);
      setLastDomain(domainFromUrl(session.url));
      setSearchQuery(session.label);
      setBrief(session.brief);
      setCurrentHistoryId(session.currentHistoryId);
      setLinkedinPosts(session.linkedinPosts);
      setOwnIntel(session.ownIntel);
      return;
    }
    const mapSession = loadMapSession();
    if (mapSession) {
      setSearchMode("mapping");
      setLastLabel(mapSession.label);
      setLastUrl(mapSession.url);
      setLastDomain(domainFromUrl(mapSession.url));
      setSearchQuery(mapSession.label);
      if (mapSession.region) setMapRegion(mapSession.region);
      setAccountMap(mapSession.accountMap);
    }
  }, []);

  useEffect(() => {
    if (!historyParam) return;
    const entry = loadHistory().find(h => h.id === historyParam);
    if (entry) handleHistorySelect(entry);
  }, [historyParam]);

  async function handleSearch(url: string, label: string) {
    setLoading(true); setError(null); setBrief(null); setAccountMap(null); setLastLabel(label); setLastUrl(url); setLastDomain(domainFromUrl(url)); setLogoFailed(false); setShowFullEmail(false);
    setSearchQuery(label);
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
      const id = Date.now().toString();
      saveToHistory({
        id,
        label,
        url,
        icpScore: data.icpFitScore?.score ?? 0,
        savedAt: new Date().toISOString(),
        brief: data,
        watched: true,
      });
      setWatchingSignals(true);
      setCurrentHistoryId(id);
      clearMapSession();
      saveBriefSession({
        label,
        url,
        brief: data,
        currentHistoryId: id,
        linkedinPosts,
        ownIntel,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); setCooldownSeconds(30); }
  }

  async function handleMapSearch(company: string) {
    const yourCompany = yourCompanyForRequest(loadYourCompany());
    if (!yourCompany) {
      setError("Complete Your Company setup before running a map.");
      return;
    }

    setMapLoading(true);
    setError(null);
    setAccountMap(null);
    setBrief(null);
    clearBriefSession();
    const label = company.trim();
    setLastLabel(label);
    setSearchQuery(label);
    const mapUrl = label.startsWith("http") ? label : `https://${label}`;
    setLastUrl(mapUrl);
    setLastDomain(domainFromUrl(mapUrl));
    if (historyParam || queryParam) setSearchParams(new URLSearchParams());

    const controller = new AbortController();
    // Slightly above server MAPPING_TIMEOUT_MS (225s) so the API error surfaces before client abort.
    const clientTimeout = setTimeout(() => controller.abort(), 235_000);

    try {
      const result = await generateAccountMap(
        { company: label, region: mapRegion, yourCompany },
        { signal: controller.signal },
      );
      setAccountMap(result);
      saveMapSession({ label, url: mapUrl, region: mapRegion, accountMap: result });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Mapping took too long and was stopped. Try again — or switch to Brief mode for a faster single-company brief.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      clearTimeout(clientTimeout);
      setMapLoading(false);
    }
  }

  function handleCompanySubmit(url: string, label: string) {
    if (searchMode === "mapping") {
      void handleMapSearch(label);
      return;
    }
    void handleSearch(url, label);
  }

  async function switchToBriefAndSearch() {
    setSearchMode("brief");
    setAccountMap(null);
    if (lastLabel.trim()) {
      const url = lastUrl || (lastLabel.startsWith("http") ? lastLabel : `https://${lastLabel}`);
      await handleSearch(url, lastLabel);
    }
  }

  function handleBriefStatusChange(status: BriefStatus, lastTouchedAt?: string) {
    if (!currentHistoryId) return;
    const touched = lastTouchedAt ?? new Date().toISOString();
    updateHistoryEntry(currentHistoryId, { status, lastTouchedAt: touched });
    setBriefStatus(status);
  }

  function handleHistorySelect(entry: HistoryEntry) {
    setSearchMode("brief");
    setAccountMap(null);
    setLastLabel(entry.label); setLastUrl(entry.url); setLastDomain(domainFromUrl(entry.url)); setLogoFailed(false); setBrief(entry.brief); setError(null); setTalkTrack(null);
    setSearchQuery(entry.label);
    setCurrentHistoryId(entry.id);
    setBriefStatus(entry.status ?? "not_contacted");
    setWatchingSignals(entry.watched !== false);
    saveBriefSession({
      label: entry.label,
      url: entry.url,
      brief: entry.brief,
      currentHistoryId: entry.id,
      linkedinPosts,
      ownIntel,
    });
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

  if (!companyConfigured) {
    return <BriefSetupRequired />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero — WTTJ split: yellow top, cream bottom */}
      <div className="relative z-10">
        {/* Top half — yellow */}
        <div className="bg-primary text-foreground px-8 py-14 sm:py-16 lg:py-20">
          <div className="max-w-5xl mx-auto">
            <BearMark size={52} className="mb-6" />
            <p className="text-sm font-bold tracking-wide text-foreground/80 mb-3">GTM research</p>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.05] max-w-3xl">
              Company snapshots, buying committees, and triggers from public sources
            </h1>
            <p className="mt-4 text-lg sm:text-xl font-medium text-foreground/85 leading-snug max-w-2xl">
              {isYourCompanyConfigured(yourCompany)
                ? researchHeroSubtitle(yourCompany)
                : "Market-specific intel from public sources, LinkedIn, and press. Brief ready to send."}
            </p>
          </div>
        </div>

        {/* Bottom half — cream */}
        <div className="relative bg-secondary px-8 py-10 sm:py-12 border-b border-border">
          <div className="max-w-5xl mx-auto">
            <SearchModeToggle
              mode={searchMode}
              disabled={loading || mapLoading}
              onChange={mode => {
                setSearchMode(mode);
                setError(null);
                if (mode === "brief") {
                  setAccountMap(null);
                  clearMapSession();
                } else {
                  setBrief(null);
                  clearBriefSession();
                }
              }}
            />
            {searchMode === "mapping" && (
              <RegionSelect
                region={mapRegion}
                onChange={setMapRegion}
                disabled={mapLoading}
              />
            )}
            <CompanySearchInput
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onSearch={handleCompanySubmit}
              loading={loading || mapLoading}
              loadingLabel={searchMode === "mapping" ? "Mapping..." : "Researching..."}
              cooldownSeconds={searchMode === "brief" ? cooldownSeconds : 0}
            />
            {!brief && !accountMap && !showOptionalContext && searchMode === "brief" && (
              <button
                type="button"
                onClick={() => setShowOptionalContext(true)}
                className="mt-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <span className="text-foreground font-bold">+</span>
                Add LinkedIn signals or your intel <span className="text-muted-foreground/70">(optional)</span>
              </button>
            )}
            {!brief && !accountMap && showOptionalContext && searchMode === "brief" && (
              <div className="mt-5 space-y-3">
                <ContextPanels linkedinPosts={linkedinPosts} setLinkedinPosts={setLinkedinPosts} ownIntel={ownIntel} setOwnIntel={setOwnIntel} />
                <button
                  type="button"
                  onClick={() => setShowOptionalContext(false)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Hide optional context
                </button>
              </div>
            )}
            {loading && searchMode === "brief" && (
              <p className="text-xs font-medium text-muted-foreground mt-4 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-foreground" />
                {researchLoadingMessage(yourCompany)}
              </p>
            )}
            {mapLoading && searchMode === "mapping" && (
              <p className="text-xs font-medium text-muted-foreground mt-4 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-foreground" />
                {mappingLoadingMessage(mapLoadingSeconds)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-8 py-8 max-w-5xl mx-auto space-y-4">
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
              {searchMode === "mapping" && (
                <p className="text-xs text-destructive/80">
                  If the company is small or single-entity, switch to Brief mode.
                </p>
              )}
            </CardContent>
          </Card>
        )}
        {loading && !brief && searchMode === "brief" && <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>}
        {mapLoading && !accountMap && searchMode === "mapping" && <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>}

        {accountMap && searchMode === "mapping" && (
          <AccountMapResult
            map={accountMap}
            companyLabel={lastLabel}
            currentRegion={mapRegion}
            onSwitchToBrief={() => { void switchToBriefAndSearch(); }}
            onMapAnotherRegion={nextRegion => {
              setMapRegion(nextRegion);
              setAccountMap(null);
              setError(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
              void handleMapSearch(lastLabel);
            }}
          />
        )}

        {brief && searchMode === "brief" && (() => {
          const validTriggers = getValidTriggers(brief.recentTriggers?.items);
          const hasTriggers = validTriggers.length > 0;
          const companyLogo = lastDomain ? clearbitLogoUrl(lastDomain) : "";

          return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Company header + inline snapshot + actions */}
            <BriefCard>
              <BriefCardContent className="pt-5 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {companyLogo && !logoFailed ? (
                      <img
                        src={companyLogo}
                        alt=""
                        className="w-12 h-12 rounded-xl border border-border object-contain bg-white p-1 shrink-0"
                        onError={() => setLogoFailed(true)}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl border border-border bg-secondary flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-primary">Brief for</p>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-foreground">{lastLabel}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {[brief.companySnapshot.industry, brief.companySnapshot.location].filter(Boolean).join(" · ")}
                      </p>
                      <div className="mt-3">
                        <BriefStatusSelect
                          status={briefStatus}
                          onStatusChange={handleBriefStatusChange}
                          disabled={!currentHistoryId}
                        />
                      </div>
                      {currentHistoryId && (
                        <div className="mt-3 flex items-center gap-2">
                          <Switch
                            id="watching-signals"
                            checked={watchingSignals}
                            onCheckedChange={checked => {
                              const watched = checked === true;
                              setWatchingSignals(watched);
                              updateHistoryEntry(currentHistoryId, { watched });
                            }}
                          />
                          <Label htmlFor="watching-signals" className="text-xs text-muted-foreground cursor-pointer">
                            Watching for signals: {watchingSignals ? "ON" : "OFF"}
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end shrink-0">
                    {currentHistoryId && (
                      <Link
                        href={`/prep?h=${currentHistoryId}`}
                        onClick={() => savePrepContext(currentHistoryId, linkedinPosts, ownIntel)}
                      >
                        <Button size="sm" className="gap-1.5 text-xs h-8 px-3 rounded-xl font-bold">
                          <ClipboardList className="w-3 h-3" />Prep for call
                        </Button>
                      </Link>
                    )}
                    <Button variant="outline" size="sm" onClick={() => downloadBriefTxt(exportText(), lastLabel)} className="gap-1.5 text-xs h-8 px-3 rounded-xl border-border">
                      <Download className="w-3 h-3" />Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => printBriefPdf(brief, lastLabel, talkTrack)} className="gap-1.5 text-xs h-8 px-3 rounded-xl border-border">
                      <FileText className="w-3 h-3" />PDF
                    </Button>
                    <SaveAsIcpDialog brief={brief} companyName={lastLabel} />
                    <CopyButton getText={() => exportText()} />
                  </div>
                </div>
              </BriefCardContent>
            </BriefCard>

            {brief.researchPack && (
              <p className="text-xs font-medium text-muted-foreground">
                Reasoning pack: {brief.researchPack.name} v{brief.researchPack.version}
              </p>
            )}

            <CallDecisionCard brief={brief} />
            <OpenerCard brief={brief} />
            <NextTouchSection
              brief={brief}
              companyName={lastLabel}
              historyId={currentHistoryId}
              briefStatus={briefStatus}
              onStatusChange={handleBriefStatusChange}
              onError={message => setError(message || null)}
            />
            <WhyNowCard items={validTriggers} sources={brief.recentTriggers?.sources} />
            <BuyersCard committee={brief.buyingCommittee ?? []} />
            <DiscoveryQuestionsCard questions={brief.discoveryQuestions ?? []} />
            <ManualResearchTipsCard tips={brief.manualResearchTips ?? []} />

            <CompanySnapshotCard brief={brief} />

            <BackgroundSection
              brief={brief}
              hasTriggers={hasTriggers}
              validTriggers={validTriggers}
              showFullEmail={showFullEmail}
              setShowFullEmail={setShowFullEmail}
              emailTone={emailTone}
              emailRegenerating={emailRegenerating}
              regenerateColdEmail={regenerateColdEmail}
            />

            <BriefCard>
              <BriefCardHeader>
                <BriefCardTitle><MessageCircle className="w-4 h-4 text-primary" />Discovery Talk Track</BriefCardTitle>
                {!talkTrack && (
                  <Button variant="outline" size="sm" onClick={generateTalkTrack} disabled={talkTrackLoading} className="text-xs h-7 gap-1.5 rounded-xl border-border">
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
                  <div className="space-y-3">
                    <div>
                      <p className={`${briefCardLabelClass} mb-1`}>Open with</p>
                      <p className="text-sm text-foreground leading-snug border-l-2 border-primary pl-3">{talkTrack.opening}</p>
                    </div>
                    <div>
                      <p className={`${briefCardLabelClass} mb-1.5`}>Ask</p>
                      <BriefBulletList items={talkTrack.discoveryQuestions} />
                    </div>
                    <CopyButton getText={() => `${talkTrack.opening}\n\n${talkTrack.discoveryQuestions.map((q, i) => `• ${q}`).join("\n")}`} />
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