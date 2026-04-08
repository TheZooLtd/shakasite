import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromWorkerId: integer("from_worker_id").notNull(),
  toWorkerId: integer("to_worker_id").notNull(),
  body: text("body").notNull(),
  priority: text("priority").notNull().default("normal"), // normal | high | urgent
  thumbsUpBy: text("thumbs_up_by").notNull().default("[]"), // JSON array of worker IDs
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
