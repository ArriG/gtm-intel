import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const competitorsTable = pgTable("competitors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website").notNull(),
  tier: text("tier").notNull().default("secondary"),
  tagline: text("tagline"),
  strengths: text("strengths").notNull().default("[]"),
  weaknesses: text("weaknesses").notNull().default("[]"),
  targetSegment: text("target_segment").notNull(),
  pricing: text("pricing"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompetitorSchema = createInsertSchema(competitorsTable).omit({ id: true, createdAt: true });
export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
export type Competitor = typeof competitorsTable.$inferSelect;
