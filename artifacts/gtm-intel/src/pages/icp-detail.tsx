import { useRoute, Link } from "wouter";
import { useGetIcp, getGetIcpQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle, Target, Radio } from "lucide-react";

export default function IcpDetail() {
  const [, params] = useRoute("/icps/:id");
  const id = Number(params?.id);
  const { data: icp, isLoading } = useGetIcp(id, { query: { enabled: !!id, queryKey: getGetIcpQueryKey(id) } });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!icp) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">ICP not found.</p>
        <Link href="/icps"><Button variant="outline" className="mt-4">Back to ICPs</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/icps">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{icp.name}</h1>
          <p className="text-muted-foreground mt-1">{icp.industry} · {icp.companySize}</p>
        </div>
      </div>

      {(icp.jobTitles?.length ?? 0) > 0 && (
        <div>
          <p className="text-sm font-mono text-muted-foreground uppercase mb-2">Key Roles</p>
          <div className="flex flex-wrap gap-2">
            {icp.jobTitles?.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Pain Points</CardTitle></CardHeader>
          <CardContent>
            {icp.painPoints.length === 0 ? <p className="text-sm text-muted-foreground">None documented.</p> : (
              <ul className="space-y-2">
                {icp.painPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Goals</CardTitle></CardHeader>
          <CardContent>
            {icp.goals.length === 0 ? <p className="text-sm text-muted-foreground">None documented.</p> : (
              <ul className="space-y-2">
                {icp.goals.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Radio className="w-4 h-4 text-purple-500" /> Channels</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {icp.channels.map((ch, i) => <Badge key={i} variant="outline">{ch}</Badge>)}
          </div>
        </CardContent>
      </Card>

      {icp.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase font-mono">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{icp.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
