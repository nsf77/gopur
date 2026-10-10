import { replaceOutboxMessage, listOutbox, type OutboxItem } from "./store";
import type { ChatMessage } from "./types";

export type SendFn = (conversationId: string, body: Record<string, unknown>) => Promise<ChatMessage>;

function payload(item: OutboxItem): Record<string, unknown> {
  const body: Record<string, unknown> = { kind: item.kind };
  if (item.body) body.body = item.body;
  if (item.image_url) body.image_url = item.image_url;
  if (item.event_id) body.event_id = item.event_id;
  if (item.reply_to) body.reply_to = item.reply_to;
  return body;
}

export async function flushOutbox(userId: string, send: SendFn): Promise<void> {
  const queued = await listOutbox(userId);
  for (const item of queued) {
    try {
      const server = await send(item.conversation_id, payload(item));
      await replaceOutboxMessage(userId, item.id, server, "sent");
    } catch {
      /* stay queued */
    }
  }
}
