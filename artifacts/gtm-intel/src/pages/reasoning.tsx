import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Brain, Check, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { BearMark } from "@/components/bear-mark";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BriefCard, BriefCardContent, BriefCardHeader, BriefCardTitle } from "@/components/brief-card";
import { Badge } from "@/components/ui/badge";
import {
  loadYourCompany,
  saveYourCompany,
  useIsYourCompanyConfigured,
  useYourCompany,
  yourCompanyForRequest,
} from "@/lib/your-company";
import { detectSectorPackClient } from "@/lib/research-loading";
import {
  previewAccountBriefPrompt,
  useListSectorPacks,
  type PreviewPromptResponse,
  type SectorPackSelectionMetaMode,
} from "@workspace/api-client-react";

const AUTO_DETECT_VALUE = "__auto__";

function modeLabel(mode: SectorPackSelectionMetaMode): string {
  switch (mode) {
    case "auto": return "Auto-detected";
    case "override": return "Manual override";
    case "legacy": return "Default research plan";
  }
}

export default function ReasoningPage() {
  const profile = useYourCompany();
  const configured = useIsYourCompanyConfigured();
  const packsQuery = useListSectorPacks();

  const [whyNowPattern, setWhyNowPattern] = useState("");
  const [reasoningOverrides, setReasoningOverrides] = useState("");
  const [sectorPackOverride, setSectorPackOverride] = useState(AUTO_DETECT_VALUE);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState<PreviewPromptResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const data = loadYourCompany();
    setWhyNowPattern(data.whyNowPattern ?? "");
    setReasoningOverrides(data.reasoningOverrides ?? "");
    setSectorPackOverride(data.sectorPackOverride?.trim() || AUTO_DETECT_VALUE);
  }, [profile]);

  const clientDetect = configured ? detectSectorPackClient({
    ...profile,
    whyNowPattern,
    sectorPackOverride: sectorPackOverride === AUTO_DETECT_VALUE ? undefined : sectorPackOverride,
  }) : null;

  function buildPayload() {
    const base = yourCompanyForRequest(profile);
    if (!base) return null;
    return {
      ...base,
      whyNowPattern: whyNowPattern.trim() || undefined,
      reasoningOverrides: reasoningOverrides.trim() || undefined,
      sectorPackOverride: sectorPackOverride === AUTO_DETECT_VALUE ? undefined : sectorPackOverride,
    };
  }

  function handleSave() {
    const current = loadYourCompany();
    saveYourCompany({
      ...current,
      whyNowPattern: whyNowPattern.trim(),
      reasoningOverrides: reasoningOverrides.trim(),
      sectorPackOverride: sectorPackOverride === AUTO_DETECT_VALUE ? "" : sectorPackOverride,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handlePreview() {
    const payload = buildPayload();
    if (!payload) return;

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewAccountBriefPrompt({ yourCompany: payload });
      setPreview(result);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  if (!configured) {
    return (
      <div className="min-h-screen bg-secondary px-8 py-16">
        <div className="max-w-2xl mx-auto space-y-4">
          <BearMark size={48} />
          <h1 className="text-3xl font-extrabold">Set up Your Company first</h1>
          <p className="text-muted-foreground leading-relaxed">
            Reasoning uses your seller profile to auto-detect sector packs and compose prompts.
          </p>
          <Link href="/your-company">
            <Button className="gap-1.5">
              Go to Your Company
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const packOptions = packsQuery.data?.packs ?? [];
  const activePackLabel = preview?.sectorPackSelection.packName
    ?? packOptions.find(p => p.id === clientDetect?.packId)?.name
    ?? "Default UK/AU research plan";

  return (
    <div className="min-h-screen">
      <div className="bg-primary text-foreground px-8 py-14 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <BearMark size={52} className="mb-6" />
          <p className="text-sm font-bold tracking-wide text-foreground/80 mb-3">Reasoning</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-2xl">
            Tune how briefs think
          </h1>
          <p className="mt-4 text-lg font-medium text-foreground/85 leading-snug max-w-2xl">
            We auto-detect your sector pack from geographies, industry, and what you sell. Add why-now patterns and overrides, then preview the full system prompt.
          </p>
        </div>
      </div>

      <div className="bg-secondary px-8 py-10 sm:py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <BriefCard>
            <BriefCardHeader>
              <BriefCardTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Sector pack
              </BriefCardTitle>
            </BriefCardHeader>
            <BriefCardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-secondary/60 p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{activePackLabel}</p>
                  {preview?.sectorPackSelection && (
                    <Badge variant="outline" className="text-[10px]">
                      {modeLabel(preview.sectorPackSelection.mode)}
                    </Badge>
                  )}
                </div>
                {clientDetect && clientDetect.matchedKeywords.length > 0 && sectorPackOverride === AUTO_DETECT_VALUE && (
                  <p className="text-xs text-muted-foreground">
                    Matched on: {clientDetect.matchedKeywords.slice(0, 5).join(", ")}
                    {clientDetect.matchedKeywords.length > 5 ? "…" : ""}
                  </p>
                )}
                {sectorPackOverride === AUTO_DETECT_VALUE && !clientDetect?.packId && (
                  <p className="text-xs text-muted-foreground">
                    No sector pack matched — briefs use the default research plan for your geographies.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sectorPackOverride">Pack selection</Label>
                <Select value={sectorPackOverride} onValueChange={setSectorPackOverride}>
                  <SelectTrigger id="sectorPackOverride">
                    <SelectValue placeholder="Auto-detect from profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO_DETECT_VALUE}>Auto-detect from profile</SelectItem>
                    {packOptions.map(pack => (
                      <SelectItem key={pack.id} value={pack.id}>
                        {pack.name} (v{pack.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave on auto-detect unless the match is wrong for your motion.
                </p>
              </div>
            </BriefCardContent>
          </BriefCard>

          <BriefCard>
            <BriefCardHeader>
              <BriefCardTitle className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Why-now patterns
              </BriefCardTitle>
            </BriefCardHeader>
            <BriefCardContent>
              <div className="space-y-1.5">
                <Label htmlFor="whyNowPattern">When you walk into a great account, what&apos;s usually true?</Label>
                <Textarea
                  id="whyNowPattern"
                  value={whyNowPattern}
                  onChange={e => setWhyNowPattern(e.target.value)}
                  rows={4}
                  placeholder={"e.g.\nNew ops hire in last 90 days\nSeek ad for practice manager or underwriter\nRecent CQC Requires improvement or FCA permission change"}
                />
                <p className="text-xs text-muted-foreground">
                  Briefs prioritise these signals when scoring call decision and hunting triggers.
                </p>
              </div>
            </BriefCardContent>
          </BriefCard>

          <BriefCard>
            <BriefCardHeader>
              <BriefCardTitle>Reasoning overrides</BriefCardTitle>
            </BriefCardHeader>
            <BriefCardContent>
              <div className="space-y-1.5">
                <Label htmlFor="reasoningOverrides">Rules for this AE</Label>
                <Textarea
                  id="reasoningOverrides"
                  value={reasoningOverrides}
                  onChange={e => setReasoningOverrides(e.target.value)}
                  rows={5}
                  placeholder={"e.g.\nAlways mention GDPUK as a manual tip for UK dental\nNever lead with AI-powered\nIf they raised [Competitor X], surface neutrally only"}
                />
                <p className="text-xs text-muted-foreground">
                  Appended to the system prompt. Cannot override safety rules in the constitution.
                </p>
              </div>
            </BriefCardContent>
          </BriefCard>

          {previewError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {previewError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} className="gap-1.5">
              Save reasoning
            </Button>
            <Button variant="outline" onClick={handlePreview} disabled={previewLoading} className="gap-1.5">
              {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Preview prompt
            </Button>
            {saved && (
              <span className="text-sm text-primary flex items-center gap-1">
                <Check className="w-4 h-4" />
                Saved
              </span>
            )}
          </div>

          {preview && (
            <BriefCard>
              <BriefCardHeader>
                <BriefCardTitle>Composed system prompt</BriefCardTitle>
              </BriefCardHeader>
              <BriefCardContent>
                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono bg-secondary border border-border rounded-xl p-4 max-h-[480px] overflow-y-auto text-foreground">
                  {preview.systemPrompt}
                </pre>
              </BriefCardContent>
            </BriefCard>
          )}
        </div>
      </div>
    </div>
  );
}
