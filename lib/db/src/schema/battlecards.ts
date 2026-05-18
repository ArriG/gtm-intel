import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const battlecardsTable = pgTable("battlecards", {
  id: serial("id").primaryKey(),
  competitorId: integer("competitor_id").notNull(),
  competitorName: text("competitor_name").notNull(),
  ourStrengths: text("our_strengths").notNull().default("[]"),
  theirStrengths: text("their_strengths").notNull().default("[]"),
  objections: text("objections").notNull().default("[]"),
  winThemes: text("win_themes").notNull().default("[]"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBattlecardSchema = createInsertSchema(battlecardsTable).omit({ id: true, createdAt: true });
export type InsertBattlecard = z.infer<typeof insertBattlecardSchema>;
export type Battlecard = typeof battlecardsTable.$inferSelect;
