import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, timesheetEntriesTable, jobsTable } from "@workspace/db";
import {
  ListTimesheetsQueryParams,
  ListTimesheetsResponse,
  CreateTimesheetEntryBody,
  GetTimesheetEntryParams,
  GetTimesheetEntryResponse,
  UpdateTimesheetEntryParams,
  UpdateTimesheetEntryBody,
  UpdateTimesheetEntryResponse,
  DeleteTimesheetEntryParams,
  SignOffTimesheetEntryParams,
  SignOffTimesheetEntryBody,
  SignOffTimesheetEntryResponse,
  SignOffWeekBody,
  SignOffWeekResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/timesheets", async (req, res): Promise<void> => {
  const query = ListTimesheetsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let entries = await db.select().from(timesheetEntriesTable).orderBy(timesheetEntriesTable.date);

  if (query.data.workerId != null) {
    entries = entries.filter(e => e.workerId === query.data.workerId);
  }
  if (query.data.worksiteId != null) {
    entries = entries.filter(e => e.worksiteId === query.data.worksiteId);
  }
  if (query.data.weekStart != null) {
    entries = entries.filter(e => e.date >= (query.data.weekStart as string));
  }
  if (query.data.weekEnd != null) {
    entries = entries.filter(e => e.date <= (query.data.weekEnd as string));
  }

  res.json(ListTimesheetsResponse.parse(entries));
});

router.post("/timesheets", async (req, res): Promise<void> => {
  const parsed = CreateTimesheetEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [entry] = await db.insert(timesheetEntriesTable).values({
    ...parsed.data,
    isSignedOff: false,
  }).returning();

  // Update job hours used
  if (entry.jobId && entry.totalHours) {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, entry.jobId));
    if (job) {
      await db.update(jobsTable).set({ hoursUsed: (job.hoursUsed ?? 0) + (entry.totalHours ?? 0) }).where(eq(jobsTable.id, entry.jobId));
    }
  }

  res.status(201).json(GetTimesheetEntryResponse.parse(entry));
});

router.get("/timesheets/:id", async (req, res): Promise<void> => {
  const params = GetTimesheetEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db.select().from(timesheetEntriesTable).where(eq(timesheetEntriesTable.id, params.data.id));
  if (!entry) {
    res.status(404).json({ error: "Timesheet entry not found" });
    return;
  }
  res.json(GetTimesheetEntryResponse.parse(entry));
});

router.patch("/timesheets/:id", async (req, res): Promise<void> => {
  const params = UpdateTimesheetEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTimesheetEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.startTime !== undefined) updates.startTime = parsed.data.startTime;
  if (parsed.data.finishTime !== undefined) updates.finishTime = parsed.data.finishTime;
  if (parsed.data.lunchMinutes !== undefined) updates.lunchMinutes = parsed.data.lunchMinutes;
  if (parsed.data.totalHours !== undefined) updates.totalHours = parsed.data.totalHours;
  if (parsed.data.taskBreakdown !== undefined) updates.taskBreakdown = parsed.data.taskBreakdown;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (parsed.data.jobId !== undefined) updates.jobId = parsed.data.jobId;

  const [entry] = await db.update(timesheetEntriesTable).set(updates).where(eq(timesheetEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Timesheet entry not found" });
    return;
  }
  res.json(UpdateTimesheetEntryResponse.parse(entry));
});

router.delete("/timesheets/:id", async (req, res): Promise<void> => {
  const params = DeleteTimesheetEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db.delete(timesheetEntriesTable).where(eq(timesheetEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Timesheet entry not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/timesheets/week/signoff", async (req, res): Promise<void> => {
  const parsed = SignOffWeekBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const weekStart = parsed.data.weekStart;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const allEntries = await db.select().from(timesheetEntriesTable)
    .where(eq(timesheetEntriesTable.workerId, parsed.data.workerId));
  const weekEntries = allEntries.filter(e => e.date >= weekStart && e.date <= weekEndStr && !e.isSignedOff);

  const updated: typeof allEntries = [];
  for (const entry of weekEntries) {
    const [u] = await db.update(timesheetEntriesTable).set({
      isSignedOff: true,
      signedOffBy: parsed.data.signedOffBy,
      signedOffAt: new Date(),
    }).where(eq(timesheetEntriesTable.id, entry.id)).returning();
    if (u) updated.push(u);
  }

  res.json(SignOffWeekResponse.parse(updated));
});

router.post("/timesheets/:id/signoff", async (req, res): Promise<void> => {
  const params = SignOffTimesheetEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SignOffTimesheetEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db.update(timesheetEntriesTable).set({
    isSignedOff: true,
    signedOffBy: parsed.data.signedOffBy,
    signedOffAt: new Date(),
  }).where(eq(timesheetEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Timesheet entry not found" });
    return;
  }
  res.json(SignOffTimesheetEntryResponse.parse(entry));
});

export default router;
