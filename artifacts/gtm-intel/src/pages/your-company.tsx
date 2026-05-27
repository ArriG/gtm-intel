import { useState } from "react";
import { Link } from "wouter";
import { Check, ArrowRight, Pencil, Building2, Brain } from "lucide-react";
import { BearMark } from "@/components/bear-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BriefCard, BriefCardContent } from "@/components/brief-card";
import {
  loadYourCompany,
  saveYourCompany,
  useIsYourCompanyConfigured,
  useYourCompany,
  linesToList,
  listToLines,
  parseGeographies,
  formatGeographies,
  formatDealSizeLabels,
  toggleDealSize,
  DEAL_SIZE_OPTIONS,
  type YourCompany,
  type DealSize,
} from "@/lib/your-company";

type FormState = {
  companyName: string;
  oneLineDescription: string;
  industryServed: string;
  geographiesText: string;
  dealSize: DealSize[];
  buyerTitlesText: string;
  painPointsText: string;
  customerOutcomes: string;
};

function toFormState(data: YourCompany): FormState {
  return {
    companyName: data.companyName,
    oneLineDescription: data.oneLineDescription,
    industryServed: data.industryServed,
    geographiesText: formatGeographies(data.geographies),
    dealSize: data.dealSize,
    buyerTitlesText: listToLines(data.buyerTitles),
    painPointsText: listToLines(data.painPointsSolved),
    customerOutcomes: data.customerOutcomes ?? "",
  };
}

function formToYourCompany(form: FormState, existing?: YourCompany): YourCompany {
  return {
    companyName: form.companyName.trim(),
    oneLineDescription: form.oneLineDescription.trim(),
    industryServed: form.industryServed.trim(),
    geographies: parseGeographies(form.geographiesText),
    dealSize: form.dealSize,
    buyerTitles: linesToList(form.buyerTitlesText),
    painPointsSolved: linesToList(form.painPointsText),
    customerOutcomes: form.customerOutcomes.trim() || undefined,
    whyNowPattern: existing?.whyNowPattern,
    reasoningOverrides: existing?.reasoningOverrides,
    sectorPackOverride: existing?.sectorPackOverride,
  };
}

function ProfileSummary({ profile, onEdit }: { profile: YourCompany; onEdit: () => void }) {
  return (
    <div className="space-y-6">
      <BriefCard>
        <BriefCardContent className="pt-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border border-border bg-secondary flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your company</p>
                <h2 className="text-2xl font-extrabold text-foreground">{profile.companyName}</h2>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryField label="What you sell" value={profile.oneLineDescription} />
            <SummaryField label="Industry served" value={profile.industryServed} />
            <SummaryField label="Geographies" value={formatGeographies(profile.geographies)} />
            <SummaryField label="Deal motion" value={formatDealSizeLabels(profile.dealSize)} />
          </div>

          <SummaryField label="Typical buyers" value={profile.buyerTitles.join(", ")} />
          <SummaryField
            label="Pain points you solve"
            value={profile.painPointsSolved.map(p => `• ${p}`).join("\n")}
            multiline
          />
          {profile.customerOutcomes?.trim() && (
            <SummaryField label="Outcomes you cite" value={profile.customerOutcomes} />
          )}
        </BriefCardContent>
      </BriefCard>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/">
          <Button className="gap-1.5">
            Research an account
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/reasoning">
          <Button variant="outline" className="gap-1.5">
            <Brain className="w-4 h-4" />
            Reasoning settings
          </Button>
        </Link>
        <Button variant="outline" onClick={onEdit} className="gap-1.5">
          <Pencil className="w-4 h-4" />
          Edit profile
        </Button>
      </div>
    </div>
  );
}

function SummaryField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-sm text-foreground ${multiline ? "whitespace-pre-line leading-relaxed" : ""}`}>{value}</p>
    </div>
  );
}

export default function YourCompanyPage() {
  const savedProfile = useYourCompany();
  const savedConfigured = useIsYourCompanyConfigured();
  const [editing, setEditing] = useState(!savedConfigured);
  const [form, setForm] = useState<FormState>(() => toFormState(loadYourCompany()));
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function startEditing() {
    setForm(toFormState(loadYourCompany()));
    setErrors([]);
    setSaved(false);
    setEditing(true);
  }

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(current => ({ ...current, [field]: value }));
    if (saved) setSaved(false);
    if (errors.length > 0) setErrors([]);
  }

  function validate(next: YourCompany): string[] {
    const problems: string[] = [];
    if (!next.companyName.trim()) problems.push("Add your company name.");
    if (!next.oneLineDescription.trim()) problems.push("Add a one-line description of what you sell.");
    if (!next.industryServed.trim()) problems.push("Describe the industry your customers are in.");
    if (next.geographies.length === 0) problems.push("Add at least one geography (e.g. UK or AU, NZ).");
    if (next.dealSize.length === 0) problems.push("Tick at least one typical deal size.");
    if (next.buyerTitles.length === 0) problems.push("Add at least one buyer job title.");
    if (next.painPointsSolved.length === 0) problems.push("Add at least one pain point you solve.");
    return problems;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = formToYourCompany(form, loadYourCompany());
    const problems = validate(next);
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    saveYourCompany(next);
    setSaved(true);
    setErrors([]);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  }

  const heroTitle = savedConfigured && !editing
    ? "Your GTM foundation is set"
    : "Start here — this drives everything else";

  const heroSubtitle = savedConfigured && !editing
    ? "Your profile shapes every brief — geographies, deal motion, and industry pick the right research sources automatically."
    : "Tell us what you sell, who you serve, and where you play. Every brief, email, and fit score uses this as its foundation.";

  return (
    <div className="min-h-screen">
      <div className="bg-primary text-foreground px-8 py-14 sm:py-16 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <BearMark size={52} className="mb-6" />
          <p className="text-sm font-bold tracking-wide text-foreground/80 mb-3">Your company</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-2xl">
            {heroTitle}
          </h1>
          <p className="mt-4 text-lg font-medium text-foreground/85 leading-snug max-w-2xl">
            {heroSubtitle}
          </p>
        </div>
      </div>

      <div className="bg-secondary px-8 py-10 sm:py-12 border-b border-border">
        <div className="max-w-3xl mx-auto">
          {savedConfigured && !editing ? (
            <ProfileSummary profile={savedProfile} onEdit={startEditing} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {savedConfigured && (
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={e => handleChange("companyName", e.target.value)}
                  placeholder='e.g. Optalitix'
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="oneLineDescription">What you sell</Label>
                <Textarea
                  id="oneLineDescription"
                  value={form.oneLineDescription}
                  onChange={e => handleChange("oneLineDescription", e.target.value)}
                  rows={2}
                  placeholder="One sentence — e.g. Underwriting workbench software for banks and insurers."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="industryServed">Industry your customers are in</Label>
                <Input
                  id="industryServed"
                  value={form.industryServed}
                  onChange={e => handleChange("industryServed", e.target.value)}
                  placeholder="e.g. Banks, insurers, and reinsurers"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="geographies">Geographies</Label>
                <Input
                  id="geographies"
                  value={form.geographiesText}
                  onChange={e => handleChange("geographiesText", e.target.value)}
                  placeholder="Comma-separated — e.g. UK or AU, NZ"
                />
                <p className="text-xs text-muted-foreground">Where you sell today — briefs pick research sources from this automatically.</p>
              </div>

              <div className="space-y-3">
                <Label>Typical deal sizes (tick all that apply)</Label>
                <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
                  {DEAL_SIZE_OPTIONS.map(option => {
                    const checked = form.dealSize.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        htmlFor={`dealSize-${option.value}`}
                        className="flex items-start gap-3 cursor-pointer"
                      >
                        <Checkbox
                          id={`dealSize-${option.value}`}
                          checked={checked}
                          onCheckedChange={() => handleChange("dealSize", toggleDealSize(form.dealSize, option.value))}
                          className="mt-0.5"
                        />
                        <span className="space-y-0.5">
                          <span className="block text-sm font-medium text-foreground">{option.label}</span>
                          <span className="block text-xs text-muted-foreground">{option.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="buyerTitles">Typical buyer job titles</Label>
                <Textarea
                  id="buyerTitles"
                  value={form.buyerTitlesText}
                  onChange={e => handleChange("buyerTitlesText", e.target.value)}
                  rows={3}
                  placeholder={"One per line — e.g.\nHead of Underwriting\nChief Risk Officer\nPractice Owner"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="painPoints">Pain points you solve</Label>
                <Textarea
                  id="painPoints"
                  value={form.painPointsText}
                  onChange={e => handleChange("painPointsText", e.target.value)}
                  rows={4}
                  placeholder={"One per line — e.g.\nManual spreadsheet workflows\nSlow quote turnaround\nNo visibility into pipeline risk"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customerOutcomes">
                  Customer outcomes you can cite <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="customerOutcomes"
                  value={form.customerOutcomes}
                  onChange={e => handleChange("customerOutcomes", e.target.value)}
                  rows={3}
                  placeholder="Specific results from existing customers — e.g. 40% faster quote turnaround within 90 days."
                />
              </div>

              {errors.length > 0 && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive space-y-1">
                  {errors.map(error => <p key={error}>{error}</p>)}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="submit" className="gap-1.5">
                  Save profile
                </Button>
                {saved && (
                  <span className="text-sm text-primary flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Saved — you can run a brief now
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
