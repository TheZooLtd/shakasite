import { Router, type IRouter } from "express";
import { db, clientsTable } from "@workspace/db";
import { CreateClientBody, ListClientsResponse } from "@workspace/api-zod";
import { eq, ilike } from "drizzle-orm";

const router: IRouter = Router();

router.get("/clients", async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable).orderBy(clientsTable.name);
  res.json(ListClientsResponse.parse(clients));
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const name = parsed.data.name.trim();
  const existing = await db.select().from(clientsTable).where(ilike(clientsTable.name, name));
  if (existing.length > 0) {
    res.status(200).json(existing[0]);
    return;
  }
  const [client] = await db.insert(clientsTable).values({ name }).returning();
  res.status(201).json(client);
});

export default router;
