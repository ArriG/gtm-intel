import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, battlecardsTable } from "@workspace/db";
import {
  CreateBattlecardBody,
  UpdateBattlecardBody,
  GetBattlecardParams,
  GetBattlecardResponse,
  UpdateBattlecardParams,
  UpdateBattlecardResponse,
  DeleteBattlecardParams,
  ListBattlecardsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseBattlecard(row: typeof battlecardsTable.$inferSelect) {
  return {
    ...row,
    ourStrengths: JSON.parse(row.ourStrengths || "[]"),
    theirStrengths: JSON.parse(row.theirStrengths || "[]"),
    objections: JSON.parse(row.objections || "[]"),
    winThemes: JSON.parse(row.winThemes || "[]"),
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/battlecards", async (_req, res): Promise<void> => {
  const rows = await db.select().from(battlecardsTable).orderBy(desc(battlecardsTable.createdAt));
  res.json(ListBattlecardsResponse.parse(rows.map(parseBattlecard)));
});

router.post("/battlecards", async (req, res): Promise<void> => {
  const parsed = CreateBattlecardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { ourStrengths, theirStrengths, objections, winThemes, ...rest } = parsed.data;
  const [row] = await db
    .insert(battlecardsTable)
    .values({
      ...rest,
      ourStrengths: JSON.stringify(ourStrengths ?? []),
      theirStrengths: JSON.stringify(theirStrengths ?? []),
      objections: JSON.stringify(objections ?? []),
      winThemes: JSON.stringify(winThemes ?? []),
    })
    .returning();

  res.status(201).json(GetBattlecardResponse.parse(parseBattlecard(row)));
});

router.get("/battlecards/:id", async (req, res): Promise<void> => {
  const params = GetBattlecardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(battlecardsTable).where(eq(battlecardsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Battlecard not found" });
    return;
  }

  res.json(GetBattlecardResponse.parse(parseBattlecard(row)));
});

router.patch("/battlecards/:id", async (req, res): Promise<void> => {
  const params = UpdateBattlecardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBattlecardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { ourStrengths, theirStrengths, objections, winThemes, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (ourStrengths !== undefined) updateData.ourStrengths = JSON.stringify(ourStrengths);
  if (theirStrengths !== undefined) updateData.theirStrengths = JSON.stringify(theirStrengths);
  if (objections !== undefined) updateData.objections = JSON.stringify(objections);
  if (winThemes !== undefined) updateData.winThemes = JSON.stringify(winThemes);

  const [row] = await db
    .update(battlecardsTable)
    .set(updateData)
    .where(eq(battlecardsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Battlecard not found" });
    return;
  }

  res.json(UpdateBattlecardResponse.parse(parseBattlecard(row)));
});

router.delete("/battlecards/:id", async (req, res): Promise<void> => {
  const params = DeleteBattlecardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(battlecardsTable).where(eq(battlecardsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Battlecard not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
