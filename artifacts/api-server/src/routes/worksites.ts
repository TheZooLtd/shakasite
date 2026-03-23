import { Router, type IRouter } from "express";
import { db, worksitesTable } from "@workspace/db";
import {
  ListWorksitesResponse,
  CreateWorksiteBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/worksites", async (_req, res): Promise<void> => {
  const worksites = await db.select().from(worksitesTable).orderBy(worksitesTable.id);
  res.json(ListWorksitesResponse.parse(worksites));
});

router.post("/worksites", async (req, res): Promise<void> => {
  const parsed = CreateWorksiteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [worksite] = await db.insert(worksitesTable).values(parsed.data).returning();
  res.status(201).json(worksite);
});

export default router;
