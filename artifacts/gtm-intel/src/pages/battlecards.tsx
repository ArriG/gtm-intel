import { useState } from "react";
import { Link } from "wouter";
import { useListBattlecards, useListCompetitors, useCreateBattlecard, useDeleteBattlecard, getListBattlecardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronRight, Shield } from "lucide-react";

function CreateBattlecardDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: competitors } = useListCompetitors();
  const [form, setForm] = useState({
    competitorId: "", competitorName: "",
    ourStrengths: "", theirStrengths: "", winThemes: "", notes: "",
    objections: [{ objection: "", response: "" }],
  });
  const mutation = useCreateBattlecard();

  function handleCompetitorChange(value: string) {
    const comp = competitors?.find(c => String(c.id) === value);
    setForm(f => ({ ...f, competitorId: value, competitorName: comp?.name || "" }));
  }

  function addObjection() {
    setForm(f => ({ ...f, objections: [...f.objections, { objection: "", response: "" }] }));
  }

  function updateObjection(idx: number, field: "objection" | "response", val: string) {
    setForm(f => ({
      ...f,
      objections: f.objections.map((o, i) => i === idx ? { ...o, [field]: val } : o)
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      data: {
        competitorId: Number(form.competitorId),
        competitorName: form.competitorName,
        ourStrengths: form.ourStrengths.split("\n").map(s => s.trim()).filter(Boolean),
        theirStrengths: form.theirStrengths.split("\n").map(s => s.trim()).filter(Boolean),
        winThemes: form.winThemes.split("\n").map(s => s.trim()).filter(Boolean),
        objections: form.objections.filter(o => o.objection),
        notes: form.notes || undefined,
      }
    }, {
      onSuccess: () => { setOpen(false); onCreated(); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> New Battlecard</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Battlecard</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Competitor *</Label>
            <Select value={form.competitorId} onValueChange={handleCompetitorChange} required>
              <SelectTrigger><SelectValue placeholder="Select competitor..." /></SelectTrigger>
              <SelectContent>
                {competitors?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Our Strengths vs Them (one per line)</Label>
            <Textarea value={form.ourStrengths} onChange={e => setForm(f => ({ ...f, ourStrengths: e.target.value }))} rows={3} placeholder="Faster onboarding&#10;Better support SLA" />
          </div>
          <div className="space-y-1.5">
            <Label>Their Strengths (one per line)</Label>
            <Textarea value={form.theirStrengths} onChange={e => setForm(f => ({ ...f, theirStrengths: e.target.value }))} rows={3} placeholder="Larger ecosystem&#10;Brand recognition" />
          </div>
          <div className="space-y-1.5">
            <Label>Win Themes (one per line)</Label>
            <Textarea value={form.winThemes} onChange={e => setForm(f => ({ ...f, winThemes: e.target.value }))} rows={2} placeholder="Speed to value&#10;Lower TCO" />
          </div>
          <div className="space-y-2">
            <Label>Objection Handling</Label>
            {form.objections.map((o, i) => (
              <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/30">
                <Input placeholder="Objection..." value={o.objection} onChange={e => updateObjection(i, "objection", e.target.value)} />
                <Textarea placeholder="Response..." value={o.response} onChange={e => updateObjection(i, "response", e.target.value)} rows={2} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addObjection} className="gap-1"><Plus className="w-3 h-3" /> Add Objection</Button>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create Battlecard"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Battlecards() {
  const { data: battlecards, isLoading } = useListBattlecards();
  const deleteBattlecard = useDeleteBattlecard();
  const queryClient = useQueryClient();

  function handleDelete(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this battlecard?")) return;
    deleteBattlecard.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBattlecardsQueryKey() })
    });
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Battlecards</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm uppercase">Competitive Positioning</p>
        </div>
        <CreateBattlecardDialog onCreated={() => queryClient.invalidateQueries({ queryKey: getListBattlecardsQueryKey() })} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : battlecards?.length === 0 ? (
        <Card className="p-12 text-center bg-muted/50 border-dashed">
          <p className="text-muted-foreground">No battlecards yet. Create one to arm your sales team.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {battlecards?.map(card => (
            <Link key={card.id} href={`/battlecards/${card.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="font-bold text-lg">vs {card.competitorName}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{card.ourStrengths.length} strengths</span>
                        <span>{card.objections.length} objections handled</span>
                        <span>{card.winThemes.length} win themes</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={e => handleDelete(card.id, e)}>
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
