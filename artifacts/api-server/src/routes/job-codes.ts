import { Router, type IRouter } from "express";
import { db, jobCodeCategoriesTable, jobCodesTable } from "@workspace/db";
import {
  CreateJobCodeCategoryBody,
  CreateJobCodeBody,
  DeleteJobCodeCategoryParams,
  DeleteJobCodeParams,
  ListJobCodeCategoriesResponse,
  ListJobCodesResponse,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/job-code-categories", async (_req, res): Promise<void> => {
  const cats = await db.select().from(jobCodeCategoriesTable).orderBy(jobCodeCategoriesTable.name);
  res.json(ListJobCodeCategoriesResponse.parse(cats));
});

router.post("/job-code-categories", async (req, res): Promise<void> => {
  const parsed = CreateJobCodeCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cat] = await db.insert(jobCodeCategoriesTable).values({ name: parsed.data.name.trim() }).returning();
  res.status(201).json(cat);
});

router.delete("/job-code-categories/:id", async (req, res): Promise<void> => {
  const params = DeleteJobCodeCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(jobCodesTable).where(eq(jobCodesTable.categoryId, params.data.id));
  await db.delete(jobCodeCategoriesTable).where(eq(jobCodeCategoriesTable.id, params.data.id));
  res.status(204).end();
});

router.get("/job-codes", async (req, res): Promise<void> => {
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
  const codes = categoryId
    ? await db.select().from(jobCodesTable).where(eq(jobCodesTable.categoryId, categoryId)).orderBy(jobCodesTable.code)
    : await db.select().from(jobCodesTable).orderBy(jobCodesTable.categoryId, jobCodesTable.code);
  res.json(ListJobCodesResponse.parse(codes));
});

router.post("/job-codes", async (req, res): Promise<void> => {
  const parsed = CreateJobCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [code] = await db.insert(jobCodesTable).values(parsed.data).returning();
  res.status(201).json(code);
});

router.delete("/job-codes/:id", async (req, res): Promise<void> => {
  const params = DeleteJobCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(jobCodesTable).where(eq(jobCodesTable.id, params.data.id));
  res.status(204).end();
});

export default router;
