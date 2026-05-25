import { useState } from "react";
import { Link } from "wouter";
import { Check, ArrowRight } from "lucide-react";
import { BearMark } from "@/components/bear-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  loadYourCompany,
  saveYourCompany,
  useIsYourCompanyConfigured,
  linesToList,
  listToLines,
  parseGeographies,
  formatGeographies,
  DEAL_SIZE_OPTIONS,
  type YourCompany,
  type DealSize,
} from "@/lib/your-company";

type FormState = {
  companyName: string;
  oneLineDescription: string;
  industryServed: string;
  geographiesText: string;
  dealSize: DealSize;
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

function formToYourCompany(form: FormState): YourCompany {
  return {
    companyName: form.companyName.trim(),
    oneLineDescription: form.oneLineDescription.trim(),
    industryServed: form.industryServed.trim(),
    geographies: parseGeographies(form.geographiesText),
    dealSize: form.dealSize,
    buyerTitles: linesToList(form.buyerTitlesText),
    painPointsSolved: linesToList(form.painPointsText),
    customerOutcomes: form.customerOutcomes.trim() || undefined,
  };
}

export default function YourCompanyPage() {
  const [form, setForm] = useState<FormState>(() => toFormState(loadYourCompany()));
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const savedConfigured = useIsYourCompanyConfigured();

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
    if (!next.dealSize) problems.push("Choose a typical deal size.");
    if (next.buyerTitles.length === 0) problems.push("Add at least one buyer job title.");
    if (next.painPointsSolved.length === 0) problems.push("Add at least one pain point you solve.");
    return problems;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = formToYourCompany(form);
    const problems = validate(next);
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    saveYourCompany(next);
    setSaved(true);
    setErrors([]);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="min-h-screen">
      <div className="bg-primary text-foreground px-8 py-14 sm:py-16 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <BearMark size={52} className="mb-6" />
          <p className="text-sm font-bold tracking-wide text-foreground/80 mb-3">Your company</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-2xl">
            Start here — this drives everything else
          </h1>
          <p className="mt-4 text-lg font-medium text-foreground/85 leading-snug max-w-2xl">
            Tell us what you sell, who you serve, and where you play. Every brief, email, and signal uses this as its foundation.
          </p>
        </div>
      </div>

      <div className="bg-secondary px-8 py-10 sm:py-12 border-b border-border">
        <div className="max-w-3xl mx-auto">
          {savedConfigured && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
              <p className="text-sm text-muted-foreground">
                Your profile is saved. Update it any time — changes apply to the next brief.
              </p>
              <Link href="/">
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                  Go to Search
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="e.g. Financial services, dental practices, B2B SaaS"
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
              <p className="text-xs text-muted-foreground">Where you sell today. Milestone 2 will use this to plan research sources.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dealSize">Typical deal size</Label>
              <Select value={form.dealSize} onValueChange={value => handleChange("dealSize", value as DealSize)}>
                <SelectTrigger id="dealSize">
                  <SelectValue placeholder="Choose deal motion" />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_SIZE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} — {option.hint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        </div>
      </div>
    </div>
  );
}
