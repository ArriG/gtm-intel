import { useRoute, Link } from "wouter";
import { useGetBattlecard, getGetBattlecardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, Zap } from "lucide-react";

export default function BattlecardDetail() {
  const [, params] = useRoute("/battlecards/:id");
  const id = Number(params?.id);
  const { data: card, isLoading } = useGetBattlecard(id, { query: { enabled: !!id, queryKey: getGetBattlecardQueryKey(id) } });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Battlecard not found.</p>
        <Link href="/battlecards"><Button variant="outline" className="mt-4">Back to Battlecards</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/battlecards">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">vs {card.competitorName}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm uppercase">Competitive Battlecard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-green-700"><CheckCircle2 className="w-4 h-4" /> Our Advantages</CardTitle></CardHeader>
          <CardContent>
            {card.ourStrengths.length === 0 ? <p className="text-sm text-muted-foreground">None listed.</p> : (
              <ul className="space-y-2">
                {card.ourStrengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><XCircle className="w-4 h-4" /> Their Strengths</CardTitle></CardHeader>
          <CardContent>
            {card.theirStrengths.length === 0 ? <p className="text-sm text-muted-foreground">None listed.</p> : (
              <ul className="space-y-2">
                {card.theirStrengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {card.winThemes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" /> Win Themes</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {card.winThemes.map((t, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium border border-yellow-200">{t}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {card.objections.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Objection Handling</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {card.objections.map((o, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">They say:</p>
                <p className="text-sm italic">"{o.objection}"</p>
                <p className="font-semibold text-sm text-primary uppercase tracking-wide">You say:</p>
                <p className="text-sm">{o.response}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {card.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase font-mono">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{card.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
