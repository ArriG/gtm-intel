import { useGetDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Radio, Radar } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const TYPE_LABELS: Record<string, string> = {
  pricing_change: "Pricing",
  product_launch: "Launch",
  funding: "Funding",
  hiring: "Hiring",
  partnership: "Partnership",
  other: "Other",
};

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <PageHeader title="Command Center" subtitle="Loading intelligence feed..." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <PageHeader title="Command Center" subtitle="Your ICP radar at a glance" />
        <Link href="/signals">
          <Button variant="outline" className="gap-2">
            <Radar className="w-4 h-4" />
            Run Radar
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Defined ICPs</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{dashboard.icpCount}</div>
            {dashboard.icpCount === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <Link href="/icps" className="underline">Add ICPs</Link> to power the radar
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Signals</CardTitle>
            <Radio className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-primary">{dashboard.unreadSignalCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#2D3748]">Recent Signals</h2>
        {dashboard.recentSignals.length === 0 ? (
          <Card className="p-10 text-center bg-muted/30 border-dashed">
            <Radio className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-semibold mb-1">No signals yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Run the radar from the Signals page to scan the web for ICP-matching buying triggers.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {dashboard.recentSignals.map(signal => (
              <Card key={signal.id} className={`overflow-hidden ${signal.reviewed ? "opacity-60" : ""}`}>
                <div className="border-l-4 border-primary p-4">
                  <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                    <div>
                      {signal.companyName && (
                        <p className="text-xs font-medium text-primary mb-0.5">{signal.companyName}</p>
                      )}
                      <h3 className="font-semibold">{signal.title}</h3>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {signal.icpName && <Badge variant="secondary" className="text-xs">{signal.icpName}</Badge>}
                      <Badge variant="outline" className="font-mono text-xs">{TYPE_LABELS[signal.type] || signal.type}</Badge>
                    </div>
                  </div>
                  {signal.description && <p className="text-sm text-muted-foreground mb-3">{signal.description}</p>}
                  <div className="flex gap-2 items-center text-xs text-muted-foreground">
                    <span>{new Date(signal.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{signal.source}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
