import { useState } from "react";
import { Link } from "wouter";
import { useListIcps, useCreateIcp, useDeleteIcp, getListIcpsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronRight } from "lucide-react";

function CreateIcpDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", industry: "", companySize: "",
    jobTitles: "", painPoints: "", goals: "", channels: "", notes: "",
  });
  const mutation = useCreateIcp();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      data: {
        name: form.name,
        industry: form.industry,
        companySize: form.companySize,
        jobTitles: form.jobTitles.split("\n").map(s => s.trim()).filter(Boolean),
        painPoints: form.painPoints.split("\n").map(s => s.trim()).filter(Boolean),
        goals: form.goals.split("\n").map(s => s.trim()).filter(Boolean),
        channels: form.channels.split("\n").map(s => s.trim()).filter(Boolean),
        notes: form.notes || undefined,
      }
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ name: "", industry: "", companySize: "", jobTitles: "", painPoints: "", goals: "", channels: "", notes: "" });
        onCreated();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Add ICP</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Define New ICP</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>ICP Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Mid-Market SaaS" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Industry *</Label>
              <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} required placeholder="Software, Finance..." />
            </div>
            <div className="space-y-1.5">
              <Label>Company Size *</Label>
              <Input value={form.companySize} onChange={e => setForm(f => ({ ...f, companySize: e.target.value }))} required placeholder="50-500 employees" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Job Titles (one per line)</Label>
            <Textarea value={form.jobTitles} onChange={e => setForm(f => ({ ...f, jobTitles: e.target.value }))} rows={2} placeholder="VP of Sales&#10;Head of Revenue" />
          </div>
          <div className="space-y-1.5">
            <Label>Pain Points (one per line) *</Label>
            <Textarea value={form.painPoints} onChange={e => setForm(f => ({ ...f, painPoints: e.target.value }))} rows={3} required placeholder="Manual reporting&#10;No visibility into pipeline" />
          </div>
          <div className="space-y-1.5">
            <Label>Goals (one per line) *</Label>
            <Textarea value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} rows={3} required placeholder="Increase win rate&#10;Reduce sales cycle" />
          </div>
          <div className="space-y-1.5">
            <Label>Channels (one per line) *</Label>
            <Textarea value={form.channels} onChange={e => setForm(f => ({ ...f, channels: e.target.value }))} rows={2} required placeholder="LinkedIn&#10;Email outbound&#10;G2 reviews" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Adding..." : "Add ICP"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Icps() {
  const { data: icps, isLoading } = useListIcps();
  const deleteIcp = useDeleteIcp();
  const queryClient = useQueryClient();

  function handleDelete(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remove this ICP?")) return;
    deleteIcp.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIcpsQueryKey() })
    });
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ideal Customer Profiles</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm uppercase">Who You Serve</p>
        </div>
        <CreateIcpDialog onCreated={() => queryClient.invalidateQueries({ queryKey: getListIcpsQueryKey() })} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : icps?.length === 0 ? (
        <Card className="p-12 text-center bg-muted/50 border-dashed">
          <p className="text-muted-foreground">No ICPs defined yet. Add your first target customer profile.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {icps?.map(icp => (
            <Link key={icp.id} href={`/icps/${icp.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full">
                <CardContent className="p-5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{icp.name}</h3>
                      <p className="text-sm text-muted-foreground">{icp.industry} · {icp.companySize}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={e => handleDelete(icp.id, e)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-2" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {icp.channels.slice(0, 3).map((ch, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{ch}</Badge>
                    ))}
                    {icp.channels.length > 3 && <Badge variant="outline" className="text-xs">+{icp.channels.length - 3}</Badge>}
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
