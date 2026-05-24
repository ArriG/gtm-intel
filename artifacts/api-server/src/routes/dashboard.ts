import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, icpsTable, signalsTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function parseSignal(row: typeof signalsTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [icps, recentSignals, unreadSignals] = await Promise.all([
    db.select().from(icpsTable),
    db.select().from(signalsTable).orderBy(desc(signalsTable.createdAt)).limit(5),
    db.select().from(signalsTable).where(eq(signalsTable.reviewed, false)),
  ]);

  const summary = {
    icpCount: icps.length,
    unreadSignalCount: unreadSignals.length,
    recentSignals: recentSignals.map(parseSignal),
  };

  res.json(GetDashboardResponse.parse(summary));
});

export default router;
