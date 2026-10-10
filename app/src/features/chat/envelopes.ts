import { ingestReceivedMessage, setMessageTick } from "./store";
import { tickFromReceiptStatus } from "./ticks";
import type { ChatEnvelope } from "./types";

let openThreadId: string | null = null;

export function setOpenThreadId(id: string | null): void {
  openThreadId = id;
}

export function getOpenThreadId(): string | null {
  return openThreadId;
}

export async function ingestEnvelope(userId: string, viewerId: string, envelope: ChatEnvelope): Promise<string> {
  if (envelope.type === "message") {
    const own = envelope.message.sender_id === viewerId;
    await ingestReceivedMessage(userId, envelope.message, {
      tick: own ? "sent" : undefined,
      unread: !own && openThreadId !== envelope.conversation_id,
    });
    return envelope.id;
  }
  await setMessageTick(userId, envelope.message_id, tickFromReceiptStatus(envelope.status));
  return envelope.id;
}
