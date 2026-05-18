import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signalsTable = pgTable("signals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  source: text("source").notNull(),
  importance: text("importance").notNull().default("medium"),
  competitorId: integer("competitor_id"),
  competitorName: text("competitor_name"),
  reviewed: boolean("reviewed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, createdAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;
