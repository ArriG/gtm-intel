import { useState, useEffect, type ReactNode } from "react";
import { Link, useSearchParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, ClipboardList, Loader2, Copy, Check, FileText, AlertCircle,
  User, Target, MessageCircle, HelpCircle, Flag,
} from "lucide-react";
import type { CallPrep, MeetingType } from "@workspace/api-client-react";
import { MeetingType as MeetingTypeValues } from "@workspace/api-client-react";
import { loadHistory } from "@/lib/history";
import { loadYourCompany, yourCompanyForRequest } from "@/lib/your-company";
import { loadPrepContext } from "@/lib/call-prep-context";
import { formatCallPrepForExport, printCallPrep } from "@/lib/call-prep-export";
import { cn } from "@/lib/utils";

const MEETING_OPTIONS: { value: MeetingType; label: string; description: string }[] = [
  { value: MeetingTypeValues.discovery, label: "Discovery", description: "First call — qualify fit and understand pains" },
  { value: MeetingTypeValues.demo, label: "Demo", description: "Show the product — map to their specific needs" },
  { value: MeetingTypeValues.renewal, label: "Renewal", description: "Expand or renew — value delivered and growth" },
];

function CopyAllButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(getText());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="gap-1.5 text-xs h-8 px-3 rounded-xl border-border"
    >
      {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy all</>}
    </Button>
  );
}

function PrepBullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 list-none pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-snug">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function PrepSection({ icon: Icon, title, children }: { icon: typeof User; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function CallPrepPage() {
  const [searchParams] = useSearchParams();
  const historyId = searchParams.get("h");
  const entry = historyId ? loadHistory().find(h => h.id === historyId) : undefined;

  const [meetingType, setMeetingType] = useState<MeetingType>(MeetingTypeValues.discovery);
  const [prep, setPrep] = useState<CallPrep | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrep(null);
    setError(null);
  }, [meetingType]);

  async function generatePrep() {
    if (!entry) return;
    setLoading(true);
    setError(null);
    const ctx = historyId ? loadPrepContext(historyId) : {};
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/account-brief/prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: entry.label,
          brief: entry.brief,
          meetingType,
          linkedinPosts: ctx.linkedinPosts,
          ownIntel: ctx.ownIntel,
          yourCompany: yourCompanyForRequest(loadYourCompany()),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
      }
      setPrep(await res.json() as CallPrep);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate prep card.");
    } finally {
      setLoading(false);
    }
  }

  if (!historyId || !entry) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to search
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-foreground font-semibold">No brief selected</p>
          <p className="text-sm text-muted-foreground">Run a company search first, then open prep from the brief results.</p>
          <Link href="/"><Button className="rounded-xl">Go to search</Button></Link>
        </div>
      </div>
    );
  }

  const exportText = () => prep ? formatCallPrepForExport(prep, entry.label) : "";

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="px-8 py-8 max-w-2xl mx-auto space-y-6 print:py-4 print:px-6">
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link
            href={`/?h=${historyId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />Back to brief
          </Link>
          {prep && (
            <div className="flex items-center gap-2">
              <CopyAllButton getText={exportText} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => printCallPrep(prep, entry.label)}
                className="gap-1.5 text-xs h-8 px-3 rounded-xl border-border"
              >
                <FileText className="w-3 h-3" />Print
              </Button>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-primary mb-1">Call prep</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">{entry.label}</h1>
          <p className="mt-2 text-base text-muted-foreground">
            {entry.brief.companySnapshot?.industry} · {entry.brief.companySnapshot?.location}
          </p>
        </div>

        <div className="print:hidden space-y-4">
          <p className="text-sm font-medium text-foreground">Meeting type</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MEETING_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMeetingType(opt.value)}
                className={cn(
                  "text-left rounded-xl border px-4 py-3 transition-colors",
                  meetingType === opt.value
                    ? "border-foreground bg-foreground/[0.04] ring-1 ring-foreground"
                    : "border-border bg-card hover:bg-secondary",
                )}
              >
                <p className="text-sm font-bold text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.description}</p>
              </button>
            ))}
          </div>

          <Button
            onClick={generatePrep}
            disabled={loading}
            className="w-full sm:w-auto rounded-xl h-11 px-6 font-bold gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Generating prep card...</>
              : <><ClipboardList className="w-4 h-4" />{prep ? "Regenerate prep card" : "Generate prep card"}</>}
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2 print:hidden">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {loading && !prep && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        )}

        {prep && (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 print:border-0 print:shadow-none print:p-0 animate-in fade-in duration-300">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:hidden">
              {MEETING_OPTIONS.find(o => o.value === prep.meetingType)?.label} call
            </p>

            <PrepSection icon={User} title="Who you're meeting">
              <PrepBullets items={prep.whoYouAreMeeting} />
            </PrepSection>

            <PrepSection icon={Target} title="What they care about">
              <PrepBullets items={prep.whatTheyCareAbout} />
            </PrepSection>

            <PrepSection icon={Flag} title="Your angle">
              <PrepBullets items={prep.yourAngle} />
            </PrepSection>

            <PrepSection icon={MessageCircle} title="Open with">
              <p className="italic border-l-2 border-primary pl-3 leading-snug">{prep.openingLine}</p>
            </PrepSection>

            <PrepSection icon={HelpCircle} title="Key questions">
              <PrepBullets items={prep.keyQuestions} />
            </PrepSection>

            <PrepSection icon={ClipboardList} title="Ask for this call">
              <p className="font-semibold border-l-2 border-foreground pl-3 leading-snug">{prep.askForThisCall}</p>
            </PrepSection>
          </div>
        )}

        {!prep && !loading && (
          <p className="text-sm text-muted-foreground print:hidden">
            Pick a meeting type and generate a 1-page card — who you're talking to, your angle, questions, and what to ask for.
          </p>
        )}
      </div>
    </div>
  );
}
