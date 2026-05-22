import { useState } from "react";
import { Info, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { loadYourCompany, saveYourCompany, type YourCompany } from "@/lib/your-company";

export default function YourCompanyPage() {
  const [form, setForm] = useState<YourCompany>(() => loadYourCompany());
  const [saved, setSaved] = useState(false);

  function handleChange(field: keyof YourCompany, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    if (saved) setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveYourCompany(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Your Company</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm uppercase">Foundation</p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80 leading-relaxed">
          Start here to describe your company's mission, the pain points you solve, and the outcomes you strive for. This context will inform every cold email and brief.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Your company name</Label>
          <Input id="companyName" value={form.companyName} onChange={e => handleChange("companyName", e.target.value)} placeholder="e.g. Practi Health" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whatYouSell">What you sell</Label>
          <Textarea id="whatYouSell" value={form.whatYouSell} onChange={e => handleChange("whatYouSell", e.target.value)} rows={2} placeholder="In 1–2 sentences, what does your company do?" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whoYouSellTo">Who you typically sell to</Label>
          <Input id="whoYouSellTo" value={form.whoYouSellTo} onChange={e => handleChange("whoYouSellTo", e.target.value)} placeholder="e.g. Dental practices in AU with 2+ locations" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="painPoints">Top 3 pain points you solve</Label>
          <Textarea
            id="painPoints"
            value={form.painPoints}
            onChange={e => handleChange("painPoints", e.target.value)}
            rows={4}
            placeholder={"One per line — e.g.\nPatients not following through with high-value treatments\nNo visibility into post-consult drop-off\nFront desk teams have no time for follow-up calls"}
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
            placeholder={"Specific results from existing customers — e.g.\n47 dental practices recovered $X in treatment revenue within 90 days."}
          />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit">Save</Button>
          {saved && (
            <span className="text-sm text-primary flex items-center gap-1">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
