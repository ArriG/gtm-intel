import { useState } from "react";
import { Link } from "wouter";
import {
  Briefcase,
  Building2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Megaphone,
  Scale,
  TrendingUp,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { AccountBrief, AccountSignal, EmailTone } from "@workspace/api-client-react";
import { EmailTone as EmailToneValues, generateSignalOpener } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BriefCard, BriefCardContent } from "@/components/brief-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatSignalDate } from "@/lib/signal-tracking";
import { dismissBriefSignal } from "@/lib/history";
import { yourCompanyForRequest } from "@/lib/your-company";

const TONE_OPTIONS: { value: EmailTone; label: string }[] = [
  { value: EmailToneValues.formal, label: "Formal" },
  { value: EmailToneValues.direct, label: "Direct" },
  { value: EmailToneValues.conversational, label: "Conversational" },
];

const TYPE_META: Record<AccountSignal["type"], { label: string; icon: LucideIcon }> = {
  leadership_hire: { label: "Leadership hire", icon: UserPlus },
  job_posting: { label: "Job posting", icon: Briefcase },
  exec_post: { label: "Executive post", icon: Megaphone },
  funding: { label: "Funding", icon: TrendingUp },
  regulation: { label: "Regulation", icon: Scale },
  earnings: { label: "Earnings", icon: FileText },
  expansion: { label: "Expansion", icon: Building2 },
  ma: { label: "M&A", icon: Building2 },
  hiring_spike: { label: "Hiring spike", icon: Users },
  product_launch: { label: "Product launch", icon: Megaphone },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs h-8 rounded-xl">
      <Copy className="w-3 h-3" />
      {copied ? "Copied" : "Copy to clipboard"}
    </Button>
  );
}

export function SignalCard({
  signal,
  briefId,
  briefHref,
  brief,
  onDismiss,
}: {
  signal: AccountSignal;
  briefId: string;
  briefHref: string;
  brief?: AccountBrief;
  onDismiss: () => void;
}) {
  const meta = TYPE_META[signal.type] ?? { label: signal.type, icon: Megaphone };
  const Icon = meta.icon;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tone, setTone] = useState<EmailTone>(EmailToneValues.direct);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opener, setOpener] = useState<string | null>(null);

  async function handleDraftOpener(selectedTone: EmailTone = tone) {
    const yourCompany = yourCompanyForRequest();
    if (!yourCompany) {
      setError("Complete Your Company setup before drafting an opener.");
      setDialogOpen(true);
      return;
    }

    setTone(selectedTone);
    setLoading(true);
    setError(null);
    setDialogOpen(true);

    try {
      const result = await generateSignalOpener({
        signal,
        brief,
        yourCompany,
        tone: selectedTone,
      });
      setOpener(result.opener);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate an opener right now — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    dismissBriefSignal(briefId, signal);
    onDismiss();
  }

  return (
    <>
      <BriefCard>
        <BriefCardContent className="pt-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1.5 text-xs font-medium">
                <Icon className="w-3 h-3" />
                {meta.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono">
                Tier {signal.tier}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatSignalDate(signal)}</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm leading-snug">{signal.headline}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{signal.summary}</p>
          </div>

          <div className="rounded-lg border-l-4 border-primary/40 bg-primary/5 px-4 py-3">
            <p className="text-xs font-medium text-foreground mb-1">Why it matters</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{signal.whyItMatters}</p>
          </div>

          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            {signal.sourceTitle}
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" className="text-xs h-8 rounded-xl" onClick={() => handleDraftOpener()}>
              Draft opener
            </Button>
            <Link href={briefHref}>
              <Button variant="outline" size="sm" className="text-xs h-8 rounded-xl">
                Open brief
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 rounded-xl text-muted-foreground"
              onClick={handleDismiss}
            >
              <X className="w-3 h-3 mr-1" />
              Dismiss
            </Button>
          </div>
        </BriefCardContent>
      </BriefCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Draft opener</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={tone === value ? "default" : "outline"}
                className="text-xs h-8 rounded-xl"
                disabled={loading}
                onClick={() => handleDraftOpener(value)}
              >
                {loading && tone === value ? <Loader2 className="w-3 h-3 animate-spin" /> : label}
              </Button>
            ))}
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Drafting opener...
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {opener && !loading && (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{opener}</p>
              <CopyButton text={opener} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
