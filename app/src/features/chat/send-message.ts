import { sendMessage } from "./api";
import { flushOutbox } from "./outbox";
import { enqueueOutbox, listOutbox } from "./store";

export async function sendChat(
  userId: string,
  conversationId: string,
  input: {
    kind: "text" | "emoji" | "photo";
    body?: string;
    image_url?: string;
    reply_to?: string;
  },
): Promise<boolean> {
  const localId = crypto.randomUUID();
  await enqueueOutbox(userId, {
    id: localId,
    conversation_id: conversationId,
    sender_id: userId,
    kind: input.kind,
    body: input.body,
    image_url: input.image_url,
    reply_to: input.reply_to,
    created_at: new Date().toISOString(),
  });
  await flushOutbox(userId, sendMessage);
  const queued = await listOutbox(userId);
  return !queued.some((item) => item.id === localId);
}

export function outgoingBody(raw: string): { kind: "text" | "emoji"; body: string } | { error: "empty" | "tooLong" } {
  const body = raw.trim();
  const runes = Array.from(body);
  if (runes.length === 0) return { error: "empty" };
  if (runes.length > 4000) return { error: "tooLong" };
  const emojiOnly =
    /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u200d|\ufe0f|\u{1f3fb}-\u{1f3ff}|\s)+$/u.test(body);
  return emojiOnly ? { kind: "emoji", body } : { kind: "text", body };
}
