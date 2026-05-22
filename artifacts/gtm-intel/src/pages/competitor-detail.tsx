import { useRoute, Link } from "wouter";
import { useGetCompetitor, useUpdateCompetitor, getGetCompetitorQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, CheckCircle2, XCircle } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  primary: "bg-red-100 text-red-800 border-red-200",
  secondary: "bg-yellow-100 text-yellow-800 border-yellow-200",
  emerging: "bg-green-100 text-green-800 border-green-200",
};

export default function CompetitorDetail() {
  const [, params] = useRoute("/competitors/:id");
  const id = Number(params?.id);
  const { data: competitor, isLoading } = useGetCompetitor(id, { query: { enabled: !!id, queryKey: getGetCompetitorQueryKey(id) } });
  const queryClient = useQueryClient();
  const updateCompetitor = useUpdateCompetitor();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!competitor) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Competitor not found.</p>
        <Link href="/competitors"><Button variant="outline" className="mt-4">Back to Competitors</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/competitors">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-bold tracking-tight">{competitor.name}</h1>
            <Badge className={`text-xs border ${TIER_COLORS[competitor.tier] || ""}`}>{competitor.tier}</Badge>
          </div>
          {competitor.tagline && <p className="text-muted-foreground mt-1">{competitor.tagline}</p>}
        </div>
        <a href={competitor.website} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2 shrink-0"><ExternalLink className="w-4 h-4" /> Website</Button>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase font-mono">Target Segment</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{competitor.targetSegment}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase font-mono">Pricing</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{competitor.pricing || "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground uppercase font-mono">Tracked Since</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{new Date(competitor.createdAt).toLocaleDateString()}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle2 className="w-4 h-4" /> Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            {competitor.strengths.length === 0 ? (
              <p className="text-muted-foreground text-sm">None documented.</p>
            ) : (
              <ul className="space-y-2">
                {competitor.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500"><XCircle className="w-4 h-4" /> Weaknesses</CardTitle>
          </CardHeader>
          <CardContent>
            {competitor.weaknesses.length === 0 ? (
              <p className="text-muted-foreground text-sm">None documented.</p>
            ) : (
              <ul className="space-y-2">
                {competitor.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {competitor.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase font-mono">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{competitor.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
