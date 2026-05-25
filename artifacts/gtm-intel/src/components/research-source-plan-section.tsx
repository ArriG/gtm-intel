import { useState, useEffect } from "react";
import { Loader2, Radar, Check, Pencil, Save } from "lucide-react";
import type { ResearchSource, ResearchSourcePlan } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BriefCard, BriefCardContent, BriefCardHeader, BriefCardTitle } from "@/components/brief-card";
import { yourCompanyForRequest, type YourCompany } from "@/lib/your-company";
import {
  saveResearchSourcePlan,
  SOURCE_TYPE_LABELS,
  isResearchSourcePlanConfigured,
} from "@/lib/research-source-plan";

type Props = {
  yourCompany: YourCompany;
  savedPlan: ResearchSourcePlan | null;
  onPlanSaved: () => void;
};

export function ResearchSourcePlanSection({ yourCompany, savedPlan, onPlanSaved }: Props) {
  const [draft, setDraft] = useState<ResearchSourcePlan | null>(savedPlan);
  const [editing, setEditing] = useState(!isResearchSourcePlanConfigured(savedPlan));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(savedPlan);
    setEditing(!isResearchSourcePlanConfigured(savedPlan));
  }, [savedPlan]);

  async function handleGenerate() {
    const payload = yourCompanyForRequest(yourCompany);
    if (!payload) {
      setError("Complete Your Company before generating a research plan.");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/research-source-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yourCompany: payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
      }
      const data = await res.json() as { plan: ResearchSourcePlan };
      setDraft(data.plan);
      setEditing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a research plan.");
    } finally {
      setGenerating(false);
    }
  }

  function updateSource(index: number, patch: Partial<ResearchSource>) {
    if (!draft) return;
    setDraft({
      ...draft,
      sources: draft.sources.map((source, i) => (i === index ? { ...source, ...patch } : source)),
    });
  }

  function handleSave() {
    if (!draft || !isResearchSourcePlanConfigured(draft)) {
      setError("Keep at least three enabled sources before saving.");
      return;
    }
    saveResearchSourcePlan(draft);
    setEditing(false);
    setSavedFlash(true);
    setError(null);
    onPlanSaved();
    setTimeout(() => setSavedFlash(false), 2500);
  }

  const configured = isResearchSourcePlanConfigured(savedPlan);

  return (
    <div className="space-y-4 pt-8 border-t border-border">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Research sources</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            GTM Intel proposes sources based on your profile. Review, tweak, and save — briefs will search these instead of a fixed AU list.
          </p>
        </div>
        {configured && !editing && (
          <Button variant="outline" size="sm" onClick={() => { setDraft(savedPlan); setEditing(true); }} className="gap-1.5 shrink-0">
            <Pencil className="w-4 h-4" />
            Edit sources
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!draft && (
        <BriefCard>
          <BriefCardContent className="py-8 text-center space-y-4">
            <Radar className="w-10 h-10 text-primary mx-auto" />
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Generate a tailored source plan for {yourCompany.geographies.join(", ")} {yourCompany.industryServed.toLowerCase()} accounts.
            </p>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Planning sources...</> : "Generate research plan"}
            </Button>
          </BriefCardContent>
        </BriefCard>
      )}

      {draft && !editing && configured && (
        <BriefCard>
          <BriefCardHeader>
            <BriefCardTitle>How we&apos;ll research your accounts</BriefCardTitle>
            <Badge variant="secondary" className="gap-1">
              <Check className="w-3 h-3" />
              Saved
            </Badge>
          </BriefCardHeader>
          <BriefCardContent className="space-y-4">
            {savedPlan?.introMessage && (
              <p className="text-sm text-foreground leading-relaxed">{savedPlan.introMessage}</p>
            )}
            <ol className="space-y-3">
              {savedPlan!.sources.filter(source => source.enabled).map((source, index) => (
                <li key={source.id} className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                    <span className="font-semibold text-sm text-foreground">{source.name}</span>
                    <Badge variant="outline" className="text-[10px]">{SOURCE_TYPE_LABELS[source.sourceType] ?? source.sourceType}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{source.reasoning}</p>
                </li>
              ))}
            </ol>
          </BriefCardContent>
        </BriefCard>
      )}

      {draft && editing && (
        <div className="space-y-4">
          {draft.introMessage && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
              <p className="text-sm text-foreground leading-relaxed">{draft.introMessage}</p>
            </div>
          )}

          <div className="space-y-3">
            {draft.sources.map((source, index) => (
              <BriefCard key={source.id}>
                <BriefCardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                      <Badge variant="outline" className="text-[10px]">{SOURCE_TYPE_LABELS[source.sourceType] ?? source.sourceType}</Badge>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={e => updateSource(index, { enabled: e.target.checked })}
                        className="rounded border-border"
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Source name</Label>
                    <Input value={source.name} onChange={e => updateSource(index, { name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Search instruction</Label>
                    <Textarea
                      value={source.searchHint}
                      onChange={e => updateSource(index, { searchHint: e.target.value })}
                      rows={2}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Why this source</Label>
                    <Textarea
                      value={source.reasoning}
                      onChange={e => updateSource(index, { reasoning: e.target.value })}
                      rows={2}
                    />
                  </div>
                </BriefCardContent>
              </BriefCard>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} className="gap-1.5">
              <Save className="w-4 h-4" />
              Save research plan
            </Button>
            <Button variant="outline" onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Regenerating...</> : "Regenerate plan"}
            </Button>
            {configured && (
              <Button variant="ghost" onClick={() => { setDraft(savedPlan); setEditing(false); }}>
                Cancel
              </Button>
            )}
            {savedFlash && (
              <span className="text-sm text-primary flex items-center gap-1">
                <Check className="w-4 h-4" />
                Saved — ready for Search
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
