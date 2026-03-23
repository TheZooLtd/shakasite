import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timesheetEntriesTable = pgTable("timesheet_entries", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(),
  worksiteId: integer("worksite_id").notNull(),
  jobId: integer("job_id"),
  date: text("date").notNull(),
  startTime: text("start_time"),
  finishTime: text("finish_time"),
  lunchMinutes: integer("lunch_minutes"),
  totalHours: real("total_hours"),
  taskBreakdown: text("task_breakdown"),
  notes: text("notes"),
  isSignedOff: boolean("is_signed_off").notNull().default(false),
  signedOffBy: integer("signed_off_by"),
  signedOffAt: timestamp("signed_off_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTimesheetEntrySchema = createInsertSchema(timesheetEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTimesheetEntry = z.infer<typeof insertTimesheetEntrySchema>;
export type TimesheetEntry = typeof timesheetEntriesTable.$inferSelect;
