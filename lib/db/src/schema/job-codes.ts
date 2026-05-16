import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobCodeCategoriesTable = pgTable("job_code_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobCodesTable = pgTable("job_codes", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobCodeCategorySchema = createInsertSchema(jobCodeCategoriesTable).omit({ id: true, createdAt: true });
export type InsertJobCodeCategory = z.infer<typeof insertJobCodeCategorySchema>;
export type JobCodeCategory = typeof jobCodeCategoriesTable.$inferSelect;

export const insertJobCodeSchema = createInsertSchema(jobCodesTable).omit({ id: true, createdAt: true });
export type InsertJobCode = z.infer<typeof insertJobCodeSchema>;
export type JobCode = typeof jobCodesTable.$inferSelect;
