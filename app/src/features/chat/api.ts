import { api, ApiError } from "../../lib/api";
import {
  parseChatMessage,
  parseConversation,
  parseConversationList,
  parseMessageList,
  parsePendingEnvelopes,
} from "./schemas";
import type { ChatMessage, Conversation, ConversationFolder } from "./types";

async function readJson(res: Response): Promise<unknown> {
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }
  return res.json();
}

export async function fetchConversations(folder: ConversationFolder, cursor?: string) {
  return parseConversationList(
    await readJson(
      await api().conversations.$get({
        query: cursor
          ? { folder, cursor, limit: folder === "inbox" ? "20" : "50" }
          : { folder, limit: folder === "inbox" ? "20" : "50" },
      }),
    ),
  );
}

export async function fetchConversation(id: string): Promise<Conversation> {
  return parseConversation(await readJson(await api().conversations[":id"].$get({ param: { id } })));
}

export async function fetchMessages(id: string) {
  return parseMessageList(
    await readJson(
      await api().conversations[":id"].messages.$get({
        param: { id },
        query: { limit: "50" },
      }),
    ),
  );
}

export async function createDm(userId: string): Promise<Conversation> {
  return parseConversation(
    await readJson(
      await api().conversations.$post({
        json: { kind: "dm", user_id: userId },
      }),
    ),
  );
}

export async function sendMessage(conversationId: string, body: Record<string, unknown>): Promise<ChatMessage> {
  return parseChatMessage(
    await readJson(
      await api().conversations[":id"].messages.$post({
        param: { id: conversationId },
        json: {
          kind: String(body.kind ?? "text"),
          body: typeof body.body === "string" ? body.body : undefined,
          image_url: typeof body.image_url === "string" ? body.image_url : undefined,
          event_id: typeof body.event_id === "string" ? body.event_id : undefined,
          reply_to: typeof body.reply_to === "string" ? body.reply_to : undefined,
        },
      }),
    ),
  );
}

export async function registerDevice(deviceId: string): Promise<void> {
  const res = await api().chat.devices.$post({ json: { device_id: deviceId } });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  await res.json();
}

export async function fetchPending(deviceId: string) {
  return parsePendingEnvelopes(
    await readJson(await api().chat.pending.$get({ query: { device_id: deviceId } })),
  );
}

export async function ackEnvelopes(deviceId: string, ids: string[]): Promise<void> {
  const res = await api().chat.ack.$post({ json: { device_id: deviceId, ids } });
  if (!res.ok) throw new ApiError(res.status, await res.text());
}

export async function readReceipts(deviceId: string, ids: string[]): Promise<void> {
  const res = await api().chat.read.$post({ json: { device_id: deviceId, ids } });
  if (!res.ok) throw new ApiError(res.status, await res.text());
}

export async function acceptConversation(id: string): Promise<Conversation> {
  return parseConversation(
    await readJson(await api().conversations[":id"].accept.$post({ param: { id } })),
  );
}
