import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, Target, Shield } from "lucide-react";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-2">Loading intelligence feed...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm uppercase">Global Market Intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked Competitors</CardTitle>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.competitorCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Battlecards</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.battlecardCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Defined ICPs</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.icpCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Signals</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{dashboard.signalCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold">Recent Signals</h2>
          {dashboard.recentSignals.length === 0 ? (
            <Card className="p-8 text-center bg-muted/50 border-dashed">
              <p className="text-muted-foreground">No recent market signals captured.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {dashboard.recentSignals.map(signal => (
                <Card key={signal.id} className="overflow-hidden">
                  <div className="border-l-4 border-primary p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{signal.title}</h3>
                      <Badge variant="outline" className="font-mono">{signal.type}</Badge>
                    </div>
                    {signal.description && <p className="text-sm text-muted-foreground mb-4">{signal.description}</p>}
                    <div className="flex gap-2 items-center text-xs text-muted-foreground">
                      <span>{new Date(signal.createdAt).toLocaleDateString()}</span>
                      {signal.competitorName && (
                        <>
                          <span>•</span>
                          <span className="font-medium">{signal.competitorName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Top Competitors</h2>
          {dashboard.topCompetitors.length === 0 ? (
            <Card className="p-8 text-center bg-muted/50 border-dashed">
              <p className="text-muted-foreground">No competitors tracked yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {dashboard.topCompetitors.map(comp => (
                <Card key={comp.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="font-semibold">{comp.name}</div>
                      <Badge variant={comp.tier === 'primary' ? 'default' : 'secondary'}>
                        {comp.tier}
                      </Badge>
                    </div>
                    {comp.tagline && <p className="text-xs text-muted-foreground mt-2">{comp.tagline}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
