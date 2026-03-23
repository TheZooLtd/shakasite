import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const worksitesTable = pgTable("worksites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorksiteSchema = createInsertSchema(worksitesTable).omit({ id: true, createdAt: true });
export type InsertWorksite = z.infer<typeof insertWorksiteSchema>;
export type Worksite = typeof worksitesTable.$inferSelect;
