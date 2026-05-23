import { useState } from "react";
import { useListSignals, useCreateSignal, useUpdateSignal, useDeleteSignal, getListSignalsQueryKey } from "@workspace/api-client-react";
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
import { Plus, Trash2, Check, Activity, Radio } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const IMPORTANCE_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

const TYPE_LABELS: Record<string, string> = {
  pricing_change: "Pricing Change",
  product_launch: "Product Launch",
  funding: "Funding",
  hiring: "Hiring",
  partnership: "Partnership",
  other: "Other",
};

function CreateSignalDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", type: "other", source: "",
    importance: "medium", competitorName: "",
  });
  const mutation = useCreateSignal();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      data: {
        title: form.title,
        description: form.description || undefined,
        type: form.type as "pricing_change" | "product_launch" | "funding" | "hiring" | "partnership" | "other",
        source: form.source,
        importance: form.importance as "high" | "medium" | "low",
        competitorName: form.competitorName || undefined,
      }
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ title: "", description: "", type: "other", source: "", importance: "medium", competitorName: "" });
        onCreated();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Log Signal</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Log Market Signal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Signal Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Acme launched enterprise tier" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Importance</Label>
              <Select value={form.importance} onValueChange={v => setForm(f => ({ ...f, importance: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Source *</Label>
              <Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} required placeholder="LinkedIn, G2, News..." />
            </div>
            <div className="space-y-1.5">
              <Label>Competitor (optional)</Label>
              <Input value={form.competitorName} onChange={e => setForm(f => ({ ...f, competitorName: e.target.value }))} placeholder="Acme Corp" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Logging..." : "Log Signal"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Signals() {
  const { data: signals, isLoading } = useListSignals();
  const updateSignal = useUpdateSignal();
  const deleteSignal = useDeleteSignal();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState("all");
  const [filterImportance, setFilterImportance] = useState("all");

  function handleToggleReviewed(id: number, reviewed: boolean) {
    updateSignal.mutate({ id, data: { reviewed: !reviewed } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() })
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this signal?")) return;
    deleteSignal.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() })
    });
  }

  const filtered = signals?.filter(s => {
    if (filterType !== "all" && s.type !== filterType) return false;
    if (filterImportance !== "all" && s.importance !== filterImportance) return false;
    return true;
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-end justify-between">
        <PageHeader title="Signals Feed" subtitle="Market intelligence" />
        <CreateSignalDialog onCreated={() => queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() })} />
      </div>

      <div className="flex gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterImportance} onValueChange={setFilterImportance}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by importance" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Importance</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered?.length === 0 ? (
        <Card className="p-12 text-center bg-muted/30 border-dashed">
          <Radio className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-1">No signals yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">Log market triggers — funding rounds, exec hires, layoffs, expansions. They'll feed your daily Dashboard.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered?.map(signal => (
            <Card key={signal.id} className={signal.reviewed ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`shrink-0 mt-0.5 ${signal.reviewed ? "text-green-600" : "text-muted-foreground"}`}
                    onClick={() => handleToggleReviewed(signal.id, signal.reviewed)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className={`font-semibold ${signal.reviewed ? "line-through text-muted-foreground" : ""}`}>{signal.title}</p>
                      <div className="flex gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs font-mono">{TYPE_LABELS[signal.type] || signal.type}</Badge>
                        <Badge className={`text-xs border ${IMPORTANCE_COLORS[signal.importance] || ""}`}>{signal.importance}</Badge>
                      </div>
                    </div>
                    {signal.description && <p className="text-sm text-muted-foreground mt-1">{signal.description}</p>}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>via {signal.source}</span>
                      {signal.competitorName && <><span>•</span><span className="font-medium">{signal.competitorName}</span></>}
                      <span>•</span>
                      <span>{new Date(signal.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(signal.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
