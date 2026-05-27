import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Brain, Check, Loader2, Sparkles, ArrowRight, Pencil, RotateCcw } from "lucide-react";
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
  type YourCompany,
} from "@/lib/your-company";
import { detectSectorPackClient } from "@/lib/research-loading";
import {
  previewAccountBriefPrompt,
  useListSectorPacks,
  type PreviewPromptResponse,
  type SectorPackOption,
} from "@workspace/api-client-react";

const AUTO_DETECT_VALUE = "__auto__";

type ReasoningFormState = {
  whyNowPattern: string;
  reasoningOverrides: string;
  sectorPackOverride: string;
};

function toReasoningFormState(data: YourCompany): ReasoningFormState {
  return {
    whyNowPattern: data.whyNowPattern ?? "",
    reasoningOverrides: data.reasoningOverrides ?? "",
    sectorPackOverride: data.sectorPackOverride?.trim() || AUTO_DETECT_VALUE,
  };
}

function hasReasoningOverrides(profile: YourCompany): boolean {
  return Boolean(
    profile.sectorPackOverride?.trim()
    || profile.whyNowPattern?.trim()
    || profile.reasoningOverrides?.trim(),
  );
}

function whyNowSummary(text?: string): string {
  const lines = text?.split("\n").map(line => line.trim()).filter(Boolean) ?? [];
  if (lines.length === 0) return "Default";
  if (lines.length === 1) return lines[0];
  return `${lines[0]} (+${lines.length - 1} more)`;
}

function overridesSummary(text?: string): string {
  const count = text?.split("\n").map(line => line.trim()).filter(Boolean).length ?? 0;
  if (count === 0) return "None";
  return `${count} active override${count === 1 ? "" : "s"}`;
}

function activePackSummary(
  profile: YourCompany,
  packOptions: SectorPackOption[],
  clientDetect: ReturnType<typeof detectSectorPackClient> | null,
) {
  const overrideId = profile.sectorPackOverride?.trim();
  if (overrideId) {
    const name = packOptions.find(pack => pack.id === overrideId)?.name ?? overrideId;
    return {
      name,
      detail: "Manual override",
      matchedKeywords: [] as string[],
    };
  }

  const packId = clientDetect?.packId;
  const name = packOptions.find(pack => pack.id === packId)?.name ?? "Default UK/AU research plan";
  return {
    name,
    detail: packId ? "Auto-detected from Your Company" : "Default research plan for your geographies",
    matchedKeywords: clientDetect?.matchedKeywords ?? [],
  };
}

function buildPayload(profile: YourCompany, form: ReasoningFormState) {
  const base = yourCompanyForRequest(profile);
  if (!base) return null;

  return {
    ...base,
    whyNowPattern: form.whyNowPattern.trim() || undefined,
    reasoningOverrides: form.reasoningOverrides.trim() || undefined,
    sectorPackOverride: form.sectorPackOverride === AUTO_DETECT_VALUE ? undefined : form.sectorPackOverride,
  };
}

function SummaryField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-sm text-foreground ${multiline ? "whitespace-pre-line leading-relaxed" : ""}`}>{value}</p>
    </div>
  );
}

function ReasoningSummary({
  profile,
  packOptions,
  clientDetect,
  onEdit,
  onOverridePack,
  onPreview,
  onReset,
  previewLoading,
  hasOverrides,
}: {
  profile: YourCompany;
  packOptions: SectorPackOption[];
  clientDetect: ReturnType<typeof detectSectorPackClient> | null;
  onEdit: () => void;
  onOverridePack: () => void;
  onPreview: () => void;
  onReset: () => void;
  previewLoading: boolean;
  hasOverrides: boolean;
}) {
  const pack = activePackSummary(profile, packOptions, clientDetect);

  return (
    <div className="space-y-6">
      <BriefCard>
        <BriefCardContent className="pt-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border border-border bg-secondary flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reasoning</p>
                <h2 className="text-2xl font-extrabold text-foreground">Configured</h2>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
              <Check className="w-3.5 h-3.5" />
              Ready
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <SummaryField label="Active pack" value={`${pack.name} (${pack.detail})`} />
              {pack.matchedKeywords.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Matched on: {pack.matchedKeywords.slice(0, 5).join(", ")}
                  {pack.matchedKeywords.length > 5 ? "…" : ""}
                </p>
              )}
            </div>
            <SummaryField label="Why-now pattern" value={whyNowSummary(profile.whyNowPattern)} />
            <SummaryField label="Reasoning overrides" value={overridesSummary(profile.reasoningOverrides)} />
          </div>
        </BriefCardContent>
      </BriefCard>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onEdit} className="gap-1.5">
          <Pencil className="w-4 h-4" />
          Edit reasoning
        </Button>
        <Button variant="outline" onClick={onOverridePack} className="gap-1.5">
          Override pack
        </Button>
        <Button variant="outline" onClick={onPreview} disabled={previewLoading} className="gap-1.5">
          {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Preview prompt
        </Button>
        {hasOverrides && (
          <Button variant="outline" onClick={onReset} className="gap-1.5">
            <RotateCcw className="w-4 h-4" />
            Reset to auto-detect
          </Button>
        )}
      </div>
    </div>
  );
}

function ReasoningEditForm({
  form,
  packOptions,
  clientDetect,
  onChange,
  onSave,
  onCancel,
  onPreview,
  previewLoading,
  savedFlash,
}: {
  form: ReasoningFormState;
  packOptions: SectorPackOption[];
  clientDetect: ReturnType<typeof detectSectorPackClient> | null;
  onChange: <K extends keyof ReasoningFormState>(field: K, value: ReasoningFormState[K]) => void;
  onSave: () => void;
  onCancel: () => void;
  onPreview: () => void;
  previewLoading: boolean;
  savedFlash: boolean;
}) {
  const activePackLabel = packOptions.find(p => p.id === (
    form.sectorPackOverride === AUTO_DETECT_VALUE ? clientDetect?.packId : form.sectorPackOverride
  ))?.name ?? "Default UK/AU research plan";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-foreground">Edit reasoning</p>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <BriefCard>
        <BriefCardHeader>
          <BriefCardTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Sector pack
          </BriefCardTitle>
        </BriefCardHeader>
        <BriefCardContent className="space-y-4">
          <div className="rounded-xl border border-border bg-secondary/60 p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">{activePackLabel}</p>
            {form.sectorPackOverride === AUTO_DETECT_VALUE && clientDetect && clientDetect.matchedKeywords.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Matched on: {clientDetect.matchedKeywords.slice(0, 5).join(", ")}
                {clientDetect.matchedKeywords.length > 5 ? "…" : ""}
              </p>
            )}
            {form.sectorPackOverride === AUTO_DETECT_VALUE && !clientDetect?.packId && (
              <p className="text-xs text-muted-foreground">
                No sector pack matched — briefs use the default research plan for your geographies.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sectorPackOverride">Pack selection</Label>
            <Select value={form.sectorPackOverride} onValueChange={value => onChange("sectorPackOverride", value)}>
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
              value={form.whyNowPattern}
              onChange={e => onChange("whyNowPattern", e.target.value)}
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
              value={form.reasoningOverrides}
              onChange={e => onChange("reasoningOverrides", e.target.value)}
              rows={5}
              placeholder={"e.g.\nAlways mention GDPUK as a manual tip for UK dental\nNever lead with AI-powered\nIf they raised [Competitor X], surface neutrally only"}
            />
            <p className="text-xs text-muted-foreground">
              Appended to the system prompt. Cannot override safety rules in the constitution.
            </p>
          </div>
        </BriefCardContent>
      </BriefCard>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onSave} className="gap-1.5">
          Save changes
        </Button>
        <Button variant="outline" onClick={onPreview} disabled={previewLoading} className="gap-1.5">
          {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Preview prompt
        </Button>
        {savedFlash && (
          <span className="text-sm text-primary flex items-center gap-1">
            <Check className="w-4 h-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

export default function ReasoningPage() {
  const profile = useYourCompany();
  const configured = useIsYourCompanyConfigured();
  const packsQuery = useListSectorPacks();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ReasoningFormState>(() => toReasoningFormState(loadYourCompany()));
  const [savedFlash, setSavedFlash] = useState(false);
  const [preview, setPreview] = useState<PreviewPromptResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (editing) return;
    setForm(toReasoningFormState(loadYourCompany()));
  }, [profile, editing]);

  const savedClientDetect = configured ? detectSectorPackClient(profile) : null;
  const editClientDetect = configured ? detectSectorPackClient({
    ...profile,
    whyNowPattern: form.whyNowPattern,
    sectorPackOverride: form.sectorPackOverride === AUTO_DETECT_VALUE ? undefined : form.sectorPackOverride,
  }) : null;

  function handleFormChange<K extends keyof ReasoningFormState>(field: K, value: ReasoningFormState[K]) {
    setForm(current => ({ ...current, [field]: value }));
    if (savedFlash) setSavedFlash(false);
  }

  function startEditing() {
    setForm(toReasoningFormState(loadYourCompany()));
    setSavedFlash(false);
    setEditing(true);
  }

  function handleCancel() {
    setForm(toReasoningFormState(loadYourCompany()));
    setSavedFlash(false);
    setEditing(false);
  }

  function handleSave() {
    const current = loadYourCompany();
    saveYourCompany({
      ...current,
      whyNowPattern: form.whyNowPattern.trim(),
      reasoningOverrides: form.reasoningOverrides.trim(),
      sectorPackOverride: form.sectorPackOverride === AUTO_DETECT_VALUE ? "" : form.sectorPackOverride,
    });
    setSavedFlash(true);
    setEditing(false);
    setTimeout(() => setSavedFlash(false), 2500);
  }

  function handleResetToAutoDetect() {
    const current = loadYourCompany();
    saveYourCompany({
      ...current,
      whyNowPattern: "",
      reasoningOverrides: "",
      sectorPackOverride: "",
    });
    setForm(toReasoningFormState(loadYourCompany()));
    setPreview(null);
    setEditing(false);
  }

  async function handlePreview() {
    const payload = buildPayload(profile, editing ? form : toReasoningFormState(profile));
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
  const hasOverrides = hasReasoningOverrides(profile);
  const heroTitle = editing ? "Tune how briefs think" : "How GTM Intel will reason for you";
  const heroSubtitle = editing
    ? "Adjust sector pack, why-now patterns, and overrides. Save when you are done."
    : hasOverrides
      ? "Your custom reasoning is saved. Briefs use your overrides unless you reset to auto-detect."
      : "Auto-detected from Your Company — no changes needed unless the match is wrong for your motion.";

  return (
    <div className="min-h-screen">
      <div className="bg-primary text-foreground px-8 py-14 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <BearMark size={52} className="mb-6" />
          <p className="text-sm font-bold tracking-wide text-foreground/80 mb-3">Reasoning</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-2xl">
            {heroTitle}
          </h1>
          <p className="mt-4 text-lg font-medium text-foreground/85 leading-snug max-w-2xl">
            {heroSubtitle}
          </p>
        </div>
      </div>

      <div className="bg-secondary px-8 py-10 sm:py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {!editing ? (
            <ReasoningSummary
              profile={profile}
              packOptions={packOptions}
              clientDetect={savedClientDetect}
              onEdit={startEditing}
              onOverridePack={startEditing}
              onPreview={handlePreview}
              onReset={handleResetToAutoDetect}
              previewLoading={previewLoading}
              hasOverrides={hasOverrides}
            />
          ) : (
            <ReasoningEditForm
              form={form}
              packOptions={packOptions}
              clientDetect={editClientDetect}
              onChange={handleFormChange}
              onSave={handleSave}
              onCancel={handleCancel}
              onPreview={handlePreview}
              previewLoading={previewLoading}
              savedFlash={savedFlash}
            />
          )}

          {previewError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {previewError}
            </div>
          )}

          {preview && (
            <BriefCard>
              <BriefCardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <BriefCardTitle>Composed system prompt</BriefCardTitle>
                  {preview.sectorPackSelection && (
                    <Badge variant="outline" className="text-[10px]">
                      {preview.sectorPackSelection.packName ?? "Default plan"}
                    </Badge>
                  )}
                </div>
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
