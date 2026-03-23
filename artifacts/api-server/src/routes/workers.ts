import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, workersTable, timesheetEntriesTable } from "@workspace/db";
import {
  ListWorkersResponse,
  CreateWorkerBody,
  GetWorkerParams,
  GetWorkerResponse,
  UpdateWorkerParams,
  UpdateWorkerBody,
  UpdateWorkerResponse,
  GetWorkerStatsParams,
  GetWorkerStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/workers", async (_req, res): Promise<void> => {
  const workers = await db.select().from(workersTable).orderBy(workersTable.id);
  res.json(ListWorkersResponse.parse(workers));
});

router.post("/workers", async (req, res): Promise<void> => {
  const parsed = CreateWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [worker] = await db.insert(workersTable).values(parsed.data).returning();
  res.status(201).json(GetWorkerResponse.parse(worker));
});

router.get("/workers/:id", async (req, res): Promise<void> => {
  const params = GetWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, params.data.id));
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }
  res.json(GetWorkerResponse.parse(worker));
});

router.patch("/workers/:id", async (req, res): Promise<void> => {
  const params = UpdateWorkerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined && parsed.data.name !== null) updates.name = parsed.data.name;
  if (parsed.data.mobileNumber !== undefined) updates.mobileNumber = parsed.data.mobileNumber;
  if (parsed.data.daysPerWeek !== undefined && parsed.data.daysPerWeek !== null) updates.daysPerWeek = parsed.data.daysPerWeek;
  if (parsed.data.siteManagerId !== undefined) updates.siteManagerId = parsed.data.siteManagerId;
  const [worker] = await db.update(workersTable).set(updates).where(eq(workersTable.id, params.data.id)).returning();
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }
  res.json(UpdateWorkerResponse.parse(worker));
});

router.get("/stats/worker/:workerId", async (req, res): Promise<void> => {
  const params = GetWorkerStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { workerId } = params.data;

  const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, workerId));
  if (!worker) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const allEntries = await db.select().from(timesheetEntriesTable)
    .where(eq(timesheetEntriesTable.workerId, workerId));

  const weekEntries = allEntries.filter(e => e.date >= weekStartStr && e.date <= weekEndStr);
  const weeklyHours = weekEntries.reduce((sum, e) => sum + (e.totalHours ?? 0), 0);

  const submittedDates = new Set(weekEntries.map(e => e.date));
  const submittedDaysThisWeek = submittedDates.size;

  // Check yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayEntry = allEntries.find(e => e.date === yesterdayStr);
  const missedYesterday = !yesterdayEntry && yesterday >= weekStart;

  // Top worksite (by hours)
  const worksiteHours: Record<string, number> = {};
  for (const e of weekEntries) {
    const key = String(e.worksiteId);
    worksiteHours[key] = (worksiteHours[key] ?? 0) + (e.totalHours ?? 0);
  }
  const topWorksiteId = Object.entries(worksiteHours).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Top task type from breakdowns
  const taskHours: Record<string, number> = {};
  for (const e of weekEntries) {
    if (e.taskBreakdown) {
      try {
        const breakdown = JSON.parse(e.taskBreakdown) as Record<string, number>;
        for (const [task, hrs] of Object.entries(breakdown)) {
          taskHours[task] = (taskHours[task] ?? 0) + hrs;
        }
      } catch {}
    }
  }
  const topTaskType = Object.entries(taskHours).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Streak
  let streakDays = 0;
  let checkDate = new Date(now);
  checkDate.setDate(checkDate.getDate() - 1);
  while (streakDays < 30) {
    const checkStr = checkDate.toISOString().slice(0, 10);
    const dayNum = checkDate.getDay();
    if (dayNum === 0 || dayNum === 6) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    const hasEntry = allEntries.some(e => e.date === checkStr);
    if (!hasEntry) break;
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const recentEntries = allEntries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);

  const stats = {
    workerId,
    workerName: worker.name,
    weeklyHours: Math.round(weeklyHours * 100) / 100,
    submittedDaysThisWeek,
    daysPerWeek: worker.daysPerWeek,
    streakDays,
    topWorksite: topWorksiteId ?? null,
    topTaskType: topTaskType ?? null,
    missedYesterday: !!missedYesterday,
    recentEntries,
  };

  res.json(GetWorkerStatsResponse.parse(stats));
});

export default router;
