import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, competitorsTable } from "@workspace/db";
import {
  CreateCompetitorBody,
  UpdateCompetitorBody,
  GetCompetitorParams,
  GetCompetitorResponse,
  UpdateCompetitorParams,
  UpdateCompetitorResponse,
  DeleteCompetitorParams,
  ListCompetitorsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseCompetitor(row: typeof competitorsTable.$inferSelect) {
  return {
    ...row,
    strengths: JSON.parse(row.strengths || "[]"),
    weaknesses: JSON.parse(row.weaknesses || "[]"),
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/competitors", async (_req, res): Promise<void> => {
  const rows = await db.select().from(competitorsTable).orderBy(desc(competitorsTable.createdAt));
  res.json(ListCompetitorsResponse.parse(rows.map(parseCompetitor)));
});

router.post("/competitors", async (req, res): Promise<void> => {
  const parsed = CreateCompetitorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { strengths, weaknesses, ...rest } = parsed.data;
  const [row] = await db
    .insert(competitorsTable)
    .values({
      ...rest,
      strengths: JSON.stringify(strengths ?? []),
      weaknesses: JSON.stringify(weaknesses ?? []),
    })
    .returning();

  res.status(201).json(GetCompetitorResponse.parse(parseCompetitor(row)));
});

router.get("/competitors/:id", async (req, res): Promise<void> => {
  const params = GetCompetitorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(competitorsTable).where(eq(competitorsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Competitor not found" });
    return;
  }

  res.json(GetCompetitorResponse.parse(parseCompetitor(row)));
});

router.patch("/competitors/:id", async (req, res): Promise<void> => {
  const params = UpdateCompetitorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCompetitorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { strengths, weaknesses, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (strengths !== undefined) updateData.strengths = JSON.stringify(strengths);
  if (weaknesses !== undefined) updateData.weaknesses = JSON.stringify(weaknesses);

  const [row] = await db
    .update(competitorsTable)
    .set(updateData)
    .where(eq(competitorsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Competitor not found" });
    return;
  }

  res.json(UpdateCompetitorResponse.parse(parseCompetitor(row)));
});

router.delete("/competitors/:id", async (req, res): Promise<void> => {
  const params = DeleteCompetitorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(competitorsTable).where(eq(competitorsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Competitor not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
