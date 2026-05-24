import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, signalsTable } from "@workspace/db";
import {
  UpdateSignalBody,
  UpdateSignalParams,
  UpdateSignalResponse,
  DeleteSignalParams,
  ListSignalsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseSignal(row: typeof signalsTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/signals", async (_req, res): Promise<void> => {
  const rows = await db.select().from(signalsTable).orderBy(desc(signalsTable.createdAt));
  res.json(ListSignalsResponse.parse(rows.map(parseSignal)));
});

router.patch("/signals/:id", async (req, res): Promise<void> => {
  const params = UpdateSignalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .update(signalsTable)
    .set(parsed.data)
    .where(eq(signalsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }

  res.json(UpdateSignalResponse.parse(parseSignal(row)));
});

router.delete("/signals/:id", async (req, res): Promise<void> => {
  const params = DeleteSignalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(signalsTable).where(eq(signalsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
