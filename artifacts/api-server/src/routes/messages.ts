import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
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
  const [message] = await db.insert(messagesTable).values({
    ...parsed.data,
    priority: parsed.data.priority ?? "normal",
    thumbsUpBy: "[]",
    isRead: false,
  }).returning();
  res.status(201).json(message);
});

// POST /messages/:id/thumbsup — toggle thumbs-up from a worker
router.post("/messages/:id/thumbsup", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const workerId = parseInt(req.body.workerId);
  if (isNaN(id) || isNaN(workerId)) {
    res.status(400).json({ error: "Invalid id or workerId" });
    return;
  }
  const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, id));
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  let thumbsUpBy: number[] = [];
  try { thumbsUpBy = JSON.parse(message.thumbsUpBy); } catch {}
  const already = thumbsUpBy.includes(workerId);
  const updated = already
    ? thumbsUpBy.filter(wid => wid !== workerId)
    : [...thumbsUpBy, workerId];
  const [updatedMessage] = await db
    .update(messagesTable)
    .set({ thumbsUpBy: JSON.stringify(updated) })
    .where(eq(messagesTable.id, id))
    .returning();
  res.json(updatedMessage);
});

export default router;
