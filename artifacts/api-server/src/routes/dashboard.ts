import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, competitorsTable, icpsTable, battlecardsTable, signalsTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function parseCompetitor(row: typeof competitorsTable.$inferSelect) {
  return {
    ...row,
    strengths: JSON.parse(row.strengths || "[]"),
    weaknesses: JSON.parse(row.weaknesses || "[]"),
    createdAt: row.createdAt.toISOString(),
  };
}

function parseSignal(row: typeof signalsTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [
    competitors,
    icps,
    battlecards,
    signals,
    recentSignals,
    topCompetitors,
  ] = await Promise.all([
    db.select().from(competitorsTable),
    db.select().from(icpsTable),
    db.select().from(battlecardsTable),
    db.select().from(signalsTable),
    db.select().from(signalsTable).orderBy(desc(signalsTable.createdAt)).limit(5),
    db.select().from(competitorsTable).orderBy(desc(competitorsTable.createdAt)).limit(5),
  ]);

  const summary = {
    competitorCount: competitors.length,
    icpCount: icps.length,
    battlecardCount: battlecards.length,
    signalCount: signals.length,
    recentSignals: recentSignals.map(parseSignal),
    topCompetitors: topCompetitors.map(parseCompetitor),
  };

  res.json(GetDashboardResponse.parse(summary));
});

export default router;
