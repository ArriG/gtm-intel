import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, icpsTable } from "@workspace/db";
import {
  CreateIcpBody,
  UpdateIcpBody,
  GetIcpParams,
  GetIcpResponse,
  UpdateIcpParams,
  UpdateIcpResponse,
  DeleteIcpParams,
  ListIcpsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseIcp(row: typeof icpsTable.$inferSelect) {
  return {
    ...row,
    jobTitles: JSON.parse(row.jobTitles || "[]"),
    painPoints: JSON.parse(row.painPoints || "[]"),
    goals: JSON.parse(row.goals || "[]"),
    channels: JSON.parse(row.channels || "[]"),
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/icps", async (_req, res): Promise<void> => {
  const rows = await db.select().from(icpsTable).orderBy(desc(icpsTable.createdAt));
  res.json(ListIcpsResponse.parse(rows.map(parseIcp)));
});

router.post("/icps", async (req, res): Promise<void> => {
  const parsed = CreateIcpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { jobTitles, painPoints, goals, channels, ...rest } = parsed.data;
  const [row] = await db
    .insert(icpsTable)
    .values({
      ...rest,
      jobTitles: JSON.stringify(jobTitles ?? []),
      painPoints: JSON.stringify(painPoints ?? []),
      goals: JSON.stringify(goals ?? []),
      channels: JSON.stringify(channels ?? []),
    })
    .returning();

  res.status(201).json(GetIcpResponse.parse(parseIcp(row)));
});

router.get("/icps/:id", async (req, res): Promise<void> => {
  const params = GetIcpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(icpsTable).where(eq(icpsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "ICP not found" });
    return;
  }

  res.json(GetIcpResponse.parse(parseIcp(row)));
});

router.patch("/icps/:id", async (req, res): Promise<void> => {
  const params = UpdateIcpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateIcpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { jobTitles, painPoints, goals, channels, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (jobTitles !== undefined) updateData.jobTitles = JSON.stringify(jobTitles);
  if (painPoints !== undefined) updateData.painPoints = JSON.stringify(painPoints);
  if (goals !== undefined) updateData.goals = JSON.stringify(goals);
  if (channels !== undefined) updateData.channels = JSON.stringify(channels);

  const [row] = await db
    .update(icpsTable)
    .set(updateData)
    .where(eq(icpsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "ICP not found" });
    return;
  }

  res.json(UpdateIcpResponse.parse(parseIcp(row)));
});

router.delete("/icps/:id", async (req, res): Promise<void> => {
  const params = DeleteIcpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(icpsTable).where(eq(icpsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "ICP not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
