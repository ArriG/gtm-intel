import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, FolderOpen } from "lucide-react";
import { BearMark } from "@/components/bear-mark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BriefCard, BriefCardContent } from "@/components/brief-card";
import { BriefStatusPill } from "@/components/brief-status-pill";
import {
  BRIEF_STATUS_LABELS,
  BRIEF_STATUS_VALUES,
  type BriefStatus,
} from "@/lib/brief-status";
import { useHistory, type HistoryEntry } from "@/lib/history";

type SortMode = "lastTouched" | "fit" | "created";

const DEFAULT_HIDDEN: BriefStatus[] = ["dead", "won"];

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never touched";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Never touched";

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function sectorPackLabel(entry: HistoryEntry): string {
  const pack = entry.brief.researchPack;
  if (!pack?.name) return "Default research plan";
  return `${pack.name} v${pack.version}`;
}

function sortEntries(entries: HistoryEntry[], sort: SortMode): HistoryEntry[] {
  const copy = [...entries];

  switch (sort) {
    case "fit":
      return copy.sort((a, b) => b.icpScore - a.icpScore);
    case "created":
      return copy.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    case "lastTouched":
    default:
      return copy.sort((a, b) => {
        const aTime = a.lastTouchedAt ? new Date(a.lastTouchedAt).getTime() : 0;
        const bTime = b.lastTouchedAt ? new Date(b.lastTouchedAt).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      });
  }
}

export default function MyBriefsPage() {
  const history = useHistory();
  const [sort, setSort] = useState<SortMode>("lastTouched");
  const [visibleStatuses, setVisibleStatuses] = useState<Set<BriefStatus>>(
    () => new Set(BRIEF_STATUS_VALUES.filter(status => !DEFAULT_HIDDEN.includes(status))),
  );

  const filtered = useMemo(() => {
    const visible = history.filter(entry => visibleStatuses.has(entry.status ?? "not_contacted"));
    return sortEntries(visible, sort);
  }, [history, sort, visibleStatuses]);

  function toggleStatusFilter(status: BriefStatus, checked: boolean) {
    setVisibleStatuses(current => {
      const next = new Set(current);
      if (checked) next.add(status);
      else next.delete(status);
      return next;
    });
  }

  return (
    <div className="min-h-screen">
      <div className="bg-primary text-foreground px-8 py-14 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <BearMark size={52} className="mb-6" />
          <p className="text-sm font-bold tracking-wide text-foreground/80 mb-3">Research</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-2xl">
            My briefs
          </h1>
          <p className="mt-4 text-lg font-medium text-foreground/85 leading-snug max-w-2xl">
            Track where each account stands and jump back into the brief when you need it.
          </p>
        </div>
      </div>

      <div className="bg-secondary px-8 py-10 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {history.length > 0 && (
            <BriefCard>
              <BriefCardContent className="pt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:justify-between">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Filter by status</Label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {BRIEF_STATUS_VALUES.map(status => (
                        <label key={status} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={visibleStatuses.has(status)}
                            onCheckedChange={checked => toggleStatusFilter(status, checked === true)}
                          />
                          <span className="text-xs text-foreground">{BRIEF_STATUS_LABELS[status]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:w-48">
                    <Label htmlFor="brief-sort" className="text-xs font-medium text-muted-foreground">Sort by</Label>
                    <Select value={sort} onValueChange={value => setSort(value as SortMode)}>
                      <SelectTrigger id="brief-sort" className="h-9 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lastTouched">Last touched</SelectItem>
                        <SelectItem value="fit">Account fit</SelectItem>
                        <SelectItem value="created">Created date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </BriefCardContent>
            </BriefCard>
          )}

          {filtered.length === 0 ? (
            <BriefCard>
              <BriefCardContent className="py-12 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-2xl border border-border bg-secondary flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {history.length === 0 ? "No briefs yet" : "No briefs match these filters"}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {history.length === 0
                      ? "Run a search to get started."
                      : "Try showing more statuses or change your sort order."}
                  </p>
                </div>
                {history.length === 0 && (
                  <Link href="/">
                    <Button className="gap-1.5">
                      Go to search
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </BriefCardContent>
            </BriefCard>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => (
                <BriefCard key={entry.id}>
                  <BriefCardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/?h=${entry.id}`} className="text-base font-semibold text-foreground hover:text-primary transition-colors truncate">
                            {entry.label}
                          </Link>
                          <BriefStatusPill status={entry.status ?? "not_contacted"} />
                          {entry.nextTouch && (
                            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              Next touch ready
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{entry.icpScore}/10 fit</span>
                          <span>·</span>
                          <span>{formatRelativeTime(entry.lastTouchedAt)}</span>
                          <span>·</span>
                          <span className="truncate">{sectorPackLabel(entry)}</span>
                        </div>
                      </div>
                      <Link href={`/?h=${entry.id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8 rounded-xl shrink-0">
                          Open brief
                        </Button>
                      </Link>
                    </div>
                  </BriefCardContent>
                </BriefCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
