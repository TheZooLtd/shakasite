import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, timesheetEntriesTable, workersTable, worksitesTable } from "@workspace/db";
import {
  ExportTimesheetBody,
  ExportTimesheetResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/exports/timesheet", async (req, res): Promise<void> => {
  const parsed = ExportTimesheetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let entries = await db.select().from(timesheetEntriesTable).orderBy(timesheetEntriesTable.date);
  if (parsed.data.workerId != null) {
    entries = entries.filter(e => e.workerId === parsed.data.workerId);
  }
  if (parsed.data.weekStart != null) {
    const weekEnd = new Date(parsed.data.weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    entries = entries.filter(e => e.date >= (parsed.data.weekStart as string) && e.date <= weekEndStr);
  }

  const format = parsed.data.format;
  const filename = `timesheet_export_${Date.now()}.${format === "excel" ? "xlsx" : "pdf"}`;

  res.json(ExportTimesheetResponse.parse({
    url: `/api/exports/download/${filename}`,
    filename,
    format,
  }));
});

export default router;
