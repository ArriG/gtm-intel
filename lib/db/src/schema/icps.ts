import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const icpsTable = pgTable("icps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  companySize: text("company_size").notNull(),
  jobTitles: text("job_titles").notNull().default("[]"),
  painPoints: text("pain_points").notNull().default("[]"),
  goals: text("goals").notNull().default("[]"),
  channels: text("channels").notNull().default("[]"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIcpSchema = createInsertSchema(icpsTable).omit({ id: true, createdAt: true });
export type InsertIcp = z.infer<typeof insertIcpSchema>;
export type Icp = typeof icpsTable.$inferSelect;
