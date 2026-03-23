import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, jobsTable, milestonesTable, worksitesTable, timesheetEntriesTable } from "@workspace/db";
import {
  ListJobsResponse,
  CreateJobBody,
  GetJobParams,
  GetJobResponse,
  UpdateJobParams,
  UpdateJobBody,
  UpdateJobResponse,
  ListJobMilestonesParams,
  ListJobMilestonesResponse,
  CreateJobMilestoneParams,
  CreateJobMilestoneBody,
  GetManagerStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/jobs", async (_req, res): Promise<void> => {
  const jobs = await db.select().from(jobsTable).orderBy(jobsTable.id);
  res.json(ListJobsResponse.parse(jobs));
});

router.post("/jobs", async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [job] = await db.insert(jobsTable).values({
    ...parsed.data,
    status: parsed.data.status ?? "active",
    hoursUsed: 0,
  }).returning();
  res.status(201).json(job);
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.jobId, job.id));
  res.json(GetJobResponse.parse({ ...job, milestones }));
});

router.patch("/jobs/:id", async (req, res): Promise<void> => {
  const params = UpdateJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== null && parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.budgetedHours !== undefined) updates.budgetedHours = parsed.data.budgetedHours;
  if (parsed.data.deadline !== undefined) updates.deadline = parsed.data.deadline;
  if (parsed.data.status !== null && parsed.data.status !== undefined) updates.status = parsed.data.status;
  const [job] = await db.update(jobsTable).set(updates).where(eq(jobsTable.id, params.data.id)).returning();
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(UpdateJobResponse.parse(job));
});

router.get("/jobs/:id/milestones", async (req, res): Promise<void> => {
  const params = ListJobMilestonesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const milestones = await db.select().from(milestonesTable)
    .where(eq(milestonesTable.jobId, params.data.id))
    .orderBy(milestonesTable.sortOrder);
  res.json(ListJobMilestonesResponse.parse(milestones));
});

router.post("/jobs/:id/milestones", async (req, res): Promise<void> => {
  const params = CreateJobMilestoneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateJobMilestoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [milestone] = await db.insert(milestonesTable).values({ ...parsed.data, jobId: params.data.id }).returning();
  res.status(201).json(milestone);
});

router.get("/stats/manager", async (_req, res): Promise<void> => {
  const allJobs = await db.select().from(jobsTable);
  const activeJobs = allJobs.filter(j => j.status === "active");

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const allEntries = await db.select().from(timesheetEntriesTable);
  const weekEntries = allEntries.filter(e => e.date >= weekStartStr && e.date <= weekEndStr);

  const totalHoursThisWeek = weekEntries.reduce((sum, e) => sum + (e.totalHours ?? 0), 0);
  const workerIdsThisWeek = new Set(weekEntries.map(e => e.workerId));
  const pendingSignoffs = weekEntries.filter(e => !e.isSignedOff).length;

  const worksites = await db.select().from(worksitesTable);
  const worksiteMap = Object.fromEntries(worksites.map(w => [w.id, w.name]));

  const jobSummaries = await Promise.all(activeJobs.map(async (job) => {
    const jobEntries = allEntries.filter(e => e.jobId === job.id);
    const workerSet = new Set(jobEntries.map(e => e.workerId));
    const budgetPercent = job.budgetedHours ? (job.hoursUsed / job.budgetedHours) * 100 : null;
    return {
      id: job.id,
      name: job.name,
      worksiteName: worksiteMap[job.worksiteId] ?? "Unknown",
      budgetedHours: job.budgetedHours ?? null,
      hoursUsed: job.hoursUsed,
      budgetPercent: budgetPercent !== null ? Math.round(budgetPercent * 10) / 10 : null,
      deadline: job.deadline?.toISOString() ?? null,
      status: job.status,
      isAtRisk: budgetPercent !== null && budgetPercent >= 70 && budgetPercent < 100,
      isOverBudget: budgetPercent !== null && budgetPercent >= 100,
      workerCount: workerSet.size,
    };
  }));

  const stats = {
    activeJobsCount: activeJobs.length,
    totalWorkersThisWeek: workerIdsThisWeek.size,
    totalHoursThisWeek: Math.round(totalHoursThisWeek * 100) / 100,
    pendingSignoffs,
    jobsOverBudget: jobSummaries.filter(j => j.isOverBudget).length,
    jobsAtRisk: jobSummaries.filter(j => j.isAtRisk).length,
    jobSummaries,
  };

  res.json(GetManagerStatsResponse.parse(stats));
});

export default router;
