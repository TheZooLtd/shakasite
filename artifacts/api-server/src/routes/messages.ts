import { Router, type IRouter } from "express";
import { db, messagesTable } from "@workspace/db";
import {
  ListMessagesQueryParams,
  ListMessagesResponse,
  SendMessageBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/messages", async (req, res): Promise<void> => {
  const query = ListMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  let messages = await db.select().from(messagesTable).orderBy(messagesTable.createdAt);
  if (query.data.toWorkerId != null) {
    messages = messages.filter(m => m.toWorkerId === query.data.toWorkerId);
  }
  if (query.data.fromWorkerId != null) {
    messages = messages.filter(m => m.fromWorkerId === query.data.fromWorkerId);
  }
  res.json(ListMessagesResponse.parse(messages));
});

router.post("/messages", async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [message] = await db.insert(messagesTable).values({ ...parsed.data, isRead: false }).returning();
  res.status(201).json(message);
});

export default router;
