import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { submitFeedback } from "@workspace/api-client-react";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FeedbackFeature = "brief" | "map" | "signals" | "general";
type FeedbackRating = "up" | "down";

type WidgetPhase = "idle" | "comment" | "done";

export function FeedbackWidget({
  feature,
  company,
  className,
}: {
  feature: FeedbackFeature;
  company?: string;
  className?: string;
}) {
  const [phase, setPhase] = useState<WidgetPhase>("idle");
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(selectedRating: FeedbackRating) {
    setSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        rating: selectedRating,
        feature,
        company: company?.trim() || undefined,
        comment: comment.trim() || undefined,
      });
      track("feedback_submitted", { rating: selectedRating, feature });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function chooseRating(next: FeedbackRating) {
    setRating(next);
    setPhase("comment");
    setError(null);
  }

  if (phase === "done") {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>Thanks — noted.</p>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card/60 p-4 space-y-3", className)}>
      <p className="text-sm font-medium text-foreground">Was this useful?</p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={rating === "up" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          disabled={submitting}
          onClick={() => chooseRating("up")}
        >
          <ThumbsUp className="w-4 h-4" />
          Yes
        </Button>
        <Button
          type="button"
          variant={rating === "down" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          disabled={submitting}
          onClick={() => chooseRating("down")}
        >
          <ThumbsDown className="w-4 h-4" />
          No
        </Button>
      </div>

      {phase === "comment" && rating && (
        <div className="space-y-2">
          <Textarea
            placeholder="Optional comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={submitting}
            rows={3}
            className="resize-none text-sm"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={() => void handleSend(rating)}
          >
            {submitting ? "Sending…" : "Send"}
          </Button>
        </div>
      )}
    </div>
  );
}
