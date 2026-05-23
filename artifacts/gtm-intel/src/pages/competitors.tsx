import { useState } from "react";
import { Link } from "wouter";
import { useListCompetitors, useCreateCompetitor, useDeleteCompetitor, getListCompetitorsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ExternalLink, Trash2, ChevronRight, Flag } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const TIER_COLORS: Record<string, string> = {
  primary: "bg-red-100 text-red-800 border-red-200",
  secondary: "bg-yellow-100 text-yellow-800 border-yellow-200",
  emerging: "bg-green-100 text-green-800 border-green-200",
};

function CreateCompetitorDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", website: "", tier: "secondary", tagline: "",
    targetSegment: "", pricing: "", notes: "",
    strengths: "", weaknesses: "",
  });
  const mutation = useCreateCompetitor();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      data: {
        name: form.name,
        website: form.website,
        tier: form.tier as "primary" | "secondary" | "emerging",
        tagline: form.tagline || undefined,
        targetSegment: form.targetSegment,
        pricing: form.pricing || undefined,
        notes: form.notes || undefined,
        strengths: form.strengths.split("\n").map(s => s.trim()).filter(Boolean),
        weaknesses: form.weaknesses.split("\n").map(s => s.trim()).filter(Boolean),
      }
    }, {
      onSuccess: () => { setOpen(false); setForm({ name: "", website: "", tier: "secondary", tagline: "", targetSegment: "", pricing: "", notes: "", strengths: "", weaknesses: "" }); onCreated(); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Add Competitor</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Track New Competitor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label>Website *</Label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} required placeholder="https://acme.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tier *</Label>
              <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="emerging">Emerging</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target Segment *</Label>
              <Input value={form.targetSegment} onChange={e => setForm(f => ({ ...f, targetSegment: e.target.value }))} required placeholder="Enterprise, SMB..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Their positioning tagline" />
          </div>
          <div className="space-y-1.5">
            <Label>Pricing</Label>
            <Input value={form.pricing} onChange={e => setForm(f => ({ ...f, pricing: e.target.value }))} placeholder="$29/mo, usage-based..." />
          </div>
          <div className="space-y-1.5">
            <Label>Strengths (one per line)</Label>
            <Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} rows={3} placeholder="Strong brand&#10;Large team&#10;Deep integrations" />
          </div>
          <div className="space-y-1.5">
            <Label>Weaknesses (one per line)</Label>
            <Textarea value={form.weaknesses} onChange={e => setForm(f => ({ ...f, weaknesses: e.target.value }))} rows={3} placeholder="Expensive&#10;Complex onboarding" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding..." : "Add Competitor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Competitors() {
  const { data: competitors, isLoading } = useListCompetitors();
  const deleteCompetitor = useDeleteCompetitor();
  const queryClient = useQueryClient();

  function handleDelete(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remove this competitor?")) return;
    deleteCompetitor.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCompetitorsQueryKey() })
    });
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-end justify-between">
        <PageHeader title="Competitors" subtitle="Competitive landscape" />
        <CreateCompetitorDialog onCreated={() => queryClient.invalidateQueries({ queryKey: getListCompetitorsQueryKey() })} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : competitors?.length === 0 ? (
        <Card className="p-12 text-center bg-muted/30 border-dashed">
          <Flag className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-1">No competitors yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">Add the companies you sell against. They'll inform every brief and surface in your daily signals feed.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {competitors?.map(comp => (
            <Link key={comp.id} href={`/competitors/${comp.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-lg">{comp.name}</span>
                        <Badge className={`text-xs border ${TIER_COLORS[comp.tier] || ""}`}>{comp.tier}</Badge>
                      </div>
                      {comp.tagline && <p className="text-sm text-muted-foreground mb-2">{comp.tagline}</p>}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{comp.targetSegment}</span>
                        {comp.pricing && <><span>•</span><span>{comp.pricing}</span></>}
                      </div>
                      <div className="flex gap-4 mt-3">
                        {comp.strengths.length > 0 && (
                          <div className="text-xs">
                            <span className="text-green-600 font-medium">{comp.strengths.length} strength{comp.strengths.length !== 1 ? "s" : ""}</span>
                          </div>
                        )}
                        {comp.weaknesses.length > 0 && (
                          <div className="text-xs">
                            <span className="text-red-500 font-medium">{comp.weaknesses.length} weakness{comp.weaknesses.length !== 1 ? "es" : ""}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={comp.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={e => handleDelete(comp.id, e)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
