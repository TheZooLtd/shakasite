import { Router, type IRouter } from "express";
import { db, workersTable, worksitesTable, jobsTable, milestonesTable, timesheetEntriesTable, messagesTable } from "@workspace/db";
import { SeedDataResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/seed", async (_req, res): Promise<void> => {
  const existingWorkers = await db.select().from(workersTable);
  if (existingWorkers.length > 0) {
    res.json(SeedDataResponse.parse({ message: "Data already seeded", seeded: false }));
    return;
  }

  // Workers
  const [manager] = await db.insert(workersTable).values({
    name: "James Western",
    role: "manager",
    mobileNumber: "021 555 0101",
    daysPerWeek: 5,
  }).returning();

  const [foreman] = await db.insert(workersTable).values({
    name: "Mike Tane",
    role: "manager",
    mobileNumber: "021 555 0102",
    daysPerWeek: 5,
    siteManagerId: manager.id,
  }).returning();

  const [worker1] = await db.insert(workersTable).values({
    name: "Corey Ross-Brown",
    role: "worker",
    mobileNumber: "021 555 0201",
    daysPerWeek: 5,
    siteManagerId: foreman.id,
  }).returning();

  const [worker2] = await db.insert(workersTable).values({
    name: "Liam Parata",
    role: "worker",
    mobileNumber: "021 555 0202",
    daysPerWeek: 5,
    siteManagerId: foreman.id,
  }).returning();

  const [worker3] = await db.insert(workersTable).values({
    name: "Sam Heke",
    role: "worker",
    mobileNumber: "021 555 0203",
    daysPerWeek: 4,
    siteManagerId: foreman.id,
  }).returning();

  // Worksites
  const [site1] = await db.insert(worksitesTable).values({
    name: "UC Tupuarangi",
    address: "Ilam Rd, Christchurch",
    isActive: true,
  }).returning();

  const [site2] = await db.insert(worksitesTable).values({
    name: "Northside Apartments",
    address: "45 Beach Rd, Auckland",
    isActive: true,
  }).returning();

  const [site3] = await db.insert(worksitesTable).values({
    name: "Harbour Bridge Retrofit",
    address: "Fanshawe St, Auckland",
    isActive: true,
  }).returning();

  // Jobs
  const now = new Date();
  const deadline1 = new Date(now);
  deadline1.setMonth(deadline1.getMonth() + 2);
  const deadline2 = new Date(now);
  deadline2.setMonth(deadline2.getMonth() + 1);
  const deadline3 = new Date(now);
  deadline3.setMonth(deadline3.getMonth() + 3);

  const [job1] = await db.insert(jobsTable).values({
    name: "Soffit Framing Package",
    worksiteId: site1.id,
    budgetedHours: 800,
    hoursUsed: 612,
    deadline: deadline1,
    status: "active",
  }).returning();

  const [job2] = await db.insert(jobsTable).values({
    name: "Internal Timber Framing",
    worksiteId: site1.id,
    budgetedHours: 400,
    hoursUsed: 287,
    deadline: deadline2,
    status: "active",
  }).returning();

  const [job3] = await db.insert(jobsTable).values({
    name: "Concrete Works - Level 3",
    worksiteId: site2.id,
    budgetedHours: 500,
    hoursUsed: 195,
    deadline: deadline3,
    status: "active",
  }).returning();

  const [job4] = await db.insert(jobsTable).values({
    name: "External Cladding",
    worksiteId: site3.id,
    budgetedHours: 300,
    hoursUsed: 142,
    deadline: deadline2,
    status: "active",
  }).returning();

  // Milestones for job1
  await db.insert(milestonesTable).values([
    { jobId: job1.id, name: "Framework Complete", hoursAtMilestone: 200, sortOrder: 1, completedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
    { jobId: job1.id, name: "Structural Sign-off", hoursAtMilestone: 400, sortOrder: 2, completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    { jobId: job1.id, name: "Linings Started", hoursAtMilestone: 600, sortOrder: 3 },
    { jobId: job1.id, name: "Final Inspection", hoursAtMilestone: 800, sortOrder: 4 },
  ]);

  await db.insert(milestonesTable).values([
    { jobId: job2.id, name: "Ground Floor Complete", hoursAtMilestone: 100, sortOrder: 1, completedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
    { jobId: job2.id, name: "Level 2 Frame", hoursAtMilestone: 200, sortOrder: 2, completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
    { jobId: job2.id, name: "Level 3 Frame", hoursAtMilestone: 300, sortOrder: 3 },
    { jobId: job2.id, name: "Roof Framing", hoursAtMilestone: 400, sortOrder: 4 },
  ]);

  // Get current week dates
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);

  const dateStr = (offset: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  // Timesheet entries for current week and last 2 weeks
  const entries = [];

  // This week - worker1
  for (let i = 0; i < 4; i++) {
    const breakdown: Record<string, number> = i % 2 === 0
      ? { "Soffit Framing & Lining": 7.5, "Timber Wall Linings": 2.0 }
      : { "Soffit Framing & Lining": 9.0, "Internal Timber Framing": 0.5 };
    const totalHours = Object.values(breakdown).reduce((a, b) => a + b, 0);
    entries.push({
      workerId: worker1.id,
      worksiteId: site1.id,
      jobId: job1.id,
      date: dateStr(i),
      startTime: "07:00",
      finishTime: i % 2 === 0 ? "17:00" : "17:30",
      lunchMinutes: 30,
      totalHours,
      taskBreakdown: JSON.stringify(breakdown),
      notes: null,
      isSignedOff: i < 2,
      signedOffBy: i < 2 ? manager.id : null,
      signedOffAt: i < 2 ? new Date() : null,
    });
  }

  // This week - worker2
  for (let i = 0; i < 4; i++) {
    const breakdown = { "Concrete": 4, "Formwork": 3.5, "Reinforcing Supply": 2 };
    entries.push({
      workerId: worker2.id,
      worksiteId: site2.id,
      jobId: job3.id,
      date: dateStr(i),
      startTime: "07:30",
      finishTime: "17:00",
      lunchMinutes: 30,
      totalHours: 9,
      taskBreakdown: JSON.stringify(breakdown),
      notes: null,
      isSignedOff: i < 1,
      signedOffBy: i < 1 ? manager.id : null,
      signedOffAt: i < 1 ? new Date() : null,
    });
  }

  // Last week - worker1
  for (let i = 0; i < 5; i++) {
    const breakdown = { "Soffit Framing & Lining": 9.5, "Internal Timber Framing": 0 };
    if (i === 2) breakdown["Soffit Framing & Lining"] = 7.5;
    const totalHours = [9.5, 9, 7.5, 9.5, 9][i] ?? 9;
    entries.push({
      workerId: worker1.id,
      worksiteId: site1.id,
      jobId: job1.id,
      date: dateStr(i - 7),
      startTime: "07:00",
      finishTime: "17:00",
      lunchMinutes: 30,
      totalHours,
      taskBreakdown: JSON.stringify({ "Soffit Framing & Lining": totalHours }),
      notes: i === 2 ? "Short day - early finish for safety briefing" : null,
      isSignedOff: true,
      signedOffBy: manager.id,
      signedOffAt: new Date(),
    });
  }

  // 2 weeks ago - worker1
  for (let i = 0; i < 5; i++) {
    entries.push({
      workerId: worker1.id,
      worksiteId: site1.id,
      jobId: job1.id,
      date: dateStr(i - 14),
      startTime: "07:00",
      finishTime: "17:00",
      lunchMinutes: 30,
      totalHours: 9.5,
      taskBreakdown: JSON.stringify({ "Soffit Framing & Lining": 8, "Internal Timber Framing": 1.5 }),
      notes: null,
      isSignedOff: true,
      signedOffBy: manager.id,
      signedOffAt: new Date(),
    });
  }

  // Worker3 entries
  for (let i = 0; i < 3; i++) {
    entries.push({
      workerId: worker3.id,
      worksiteId: site3.id,
      jobId: job4.id,
      date: dateStr(i),
      startTime: "07:00",
      finishTime: "16:00",
      lunchMinutes: 30,
      totalHours: 8.5,
      taskBreakdown: JSON.stringify({ "External Walls (incl. WT05)": 5, "Cladding Substrate": 3.5 }),
      notes: null,
      isSignedOff: false,
      signedOffBy: null,
      signedOffAt: null,
    });
  }

  await db.insert(timesheetEntriesTable).values(entries);

  // Messages
  await db.insert(messagesTable).values([
    {
      fromWorkerId: manager.id,
      toWorkerId: foreman.id,
      body: "Mike, can you make sure all timesheets are submitted by Friday 5pm for payroll?",
      isRead: true,
    },
    {
      fromWorkerId: foreman.id,
      toWorkerId: manager.id,
      body: "Will do. Corey and Sam are up to date. Liam still needs to submit Tuesday.",
      isRead: false,
    },
    {
      fromWorkerId: manager.id,
      toWorkerId: worker1.id,
      body: "Great work on the soffit framing this week Corey. Keep it up!",
      isRead: false,
    },
  ]);

  res.json(SeedDataResponse.parse({ message: "Demo data seeded successfully", seeded: true }));
});

export default router;
