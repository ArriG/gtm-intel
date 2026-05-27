import { useEffect, useState } from "react";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";
import type { AccountBrief, EmailTone } from "@workspace/api-client-react";
import { EmailTone as EmailToneValues, generateNextTouch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BriefCard, BriefCardContent, BriefCardHeader, BriefCardTitle, briefCardBodyClass } from "@/components/brief-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { stripCitationTags } from "@/lib/strip-citations";
import {
  getHistoryEntry,
  updateHistoryEntry,
  type BriefStatus,
  type StoredNextTouch,
  type StoredReply,
} from "@/lib/history";
import { yourCompanyForRequest } from "@/lib/your-company";

const TONE_OPTIONS: { value: EmailTone; label: string }[] = [
  { value: EmailToneValues.formal, label: "Formal" },
  { value: EmailToneValues.direct, label: "Direct" },
  { value: EmailToneValues.conversational, label: "Conversational" },
];

export function NextTouchSection({
  brief,
  companyName,
  historyId,
  briefStatus,
  onStatusChange,
  onError,
}: {
  brief: AccountBrief;
  companyName: string;
  historyId: string | null;
  briefStatus: BriefStatus;
  onStatusChange: (status: BriefStatus, lastTouchedAt: string) => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [tone, setTone] = useState<EmailTone>(EmailToneValues.direct);
  const [loading, setLoading] = useState(false);
  const [latestReply, setLatestReply] = useState<StoredReply | null>(null);
  const [nextTouch, setNextTouch] = useState<StoredNextTouch | null>(null);

  useEffect(() => {
    if (!historyId) {
      setReplyText("");
      setLatestReply(null);
      setNextTouch(null);
      return;
    }

    const entry = getHistoryEntry(historyId);
    setLatestReply(entry?.latestReply ?? null);
    setNextTouch(entry?.nextTouch ?? null);
    setReplyText(entry?.latestReply?.text ?? "");
    setTone((entry?.nextTouch?.tone as EmailTone) ?? EmailToneValues.direct);
  }, [historyId, brief]);

  async function handleGenerate() {
    if (!historyId || !replyText.trim()) return;

    const yourCompany = yourCompanyForRequest();
    if (!yourCompany) {
      onError("Complete Your Company setup before generating a next touch.");
      return;
    }

    setLoading(true);
    onError("");

    try {
      const result = await generateNextTouch({
        brief,
        reply: replyText.trim(),
        yourCompany,
        tone,
      });

      const receivedAt = new Date().toISOString();
      const storedReply: StoredReply = { text: replyText.trim(), receivedAt };
      const storedNextTouch: StoredNextTouch = {
        opener: result.opener,
        suggestion: result.suggestion,
        generatedAt: result.generatedAt,
        tone,
      };

      let nextStatus = briefStatus;
      let lastTouchedAt = new Date().toISOString();
      if (briefStatus === "not_contacted" || briefStatus === "reached_out") {
        nextStatus = "replied";
      }

      updateHistoryEntry(historyId, {
        latestReply: storedReply,
        nextTouch: storedNextTouch,
        status: nextStatus,
        lastTouchedAt,
      });

      setLatestReply(storedReply);
      setNextTouch(storedNextTouch);
      if (nextStatus !== briefStatus) {
        onStatusChange(nextStatus, lastTouchedAt);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to generate next touch. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const displayOpener = nextTouch ? stripCitationTags(nextTouch.opener) : "";
  const displaySuggestion = nextTouch ? stripCitationTags(nextTouch.suggestion) : "";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <BriefCard>
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full text-left">
            <BriefCardHeader>
              <BriefCardTitle className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Got a reply? Paste it here for a next-touch suggestion
              </BriefCardTitle>
            </BriefCardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <BriefCardContent className="space-y-4 pt-0">
            <Textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={5}
              placeholder="Paste the prospect's reply here — include their questions or objections verbatim."
              disabled={!historyId || loading}
            />

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Tone:</span>
              {TONE_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant={tone === option.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-2.5 rounded-xl"
                  disabled={loading}
                  onClick={() => setTone(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleGenerate}
                disabled={!historyId || !replyText.trim() || loading}
                className="gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {nextTouch ? "Regenerate next touch" : "Generate next touch"}
              </Button>
              {!historyId && (
                <p className="text-xs text-muted-foreground">Save this brief to history before generating a next touch.</p>
              )}
            </div>

            {nextTouch && (
              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Suggested opener</p>
                  <blockquote className="border-l-4 border-primary pl-4 italic text-sm text-foreground leading-relaxed">
                    "{displayOpener}"
                  </blockquote>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">What to do next</p>
                  <p className={`${briefCardBodyClass}`}>{displaySuggestion}</p>
                </div>
                {latestReply && (
                  <p className="text-[11px] text-muted-foreground">
                    Based on reply from {new Date(latestReply.receivedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    {companyName ? ` · ${companyName}` : ""}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8 rounded-xl"
                  disabled={loading || !replyText.trim()}
                  onClick={handleGenerate}
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate with same reply
                </Button>
              </div>
            )}
          </BriefCardContent>
        </CollapsibleContent>
      </BriefCard>
    </Collapsible>
  );
}
