import { api, jsonOrThrow } from "../../lib/api";
import type { ChatEnvelope, ChatMessage, Conversation, ConversationFolder } from "./types";

function rpc() {
  return api();
}

export async function fetchConversations(folder: ConversationFolder, cursor?: string) {
  const res = await rpc().conversations.$get({
    query: { folder, cursor, limit: folder === "inbox" ? "20" : "50" },
  });
  return jsonOrThrow<{ conversations: Conversation[]; next_cursor?: string }>(res, "conversations");
}

export async function fetchConversation(id: string) {
  const res = await rpc().conversations[":id"].$get({ param: { id } });
  return jsonOrThrow<Conversation>(res, "conversation");
}

export async function createDm(userId: string) {
  const res = await rpc().conversations.$post({ json: { kind: "dm", user_id: userId } });
  return jsonOrThrow<Conversation>(res, "create conversation");
}

export async function sendMessage(conversationId: string, body: Record<string, unknown>) {
  const res = await rpc().conversations[":id"].messages.$post({
    param: { id: conversationId },
    json: body as { kind: string; body?: string; image_url?: string; event_id?: string; reply_to?: string },
  });
  return jsonOrThrow<ChatMessage>(res, "send");
}

export async function registerDevice(deviceId: string) {
  const res = await rpc().chat.devices.$post({ json: { device_id: deviceId } });
  if (!res.ok) throw new Error(`devices ${res.status}`);
  return res.json();
}

export async function fetchPending(deviceId: string) {
  const res = await rpc().chat.pending.$get({ query: { device_id: deviceId } });
  return jsonOrThrow<{ envelopes: ChatEnvelope[] }>(res, "pending");
}

export async function ackEnvelopes(deviceId: string, ids: string[]) {
  const res = await rpc().chat.ack.$post({ json: { device_id: deviceId, ids } });
  if (!res.ok) throw new Error(`ack ${res.status}`);
  return res.json();
}

export async function readReceipts(deviceId: string, ids: string[]) {
  const res = await rpc().chat.read.$post({ json: { device_id: deviceId, ids } });
  if (!res.ok) throw new Error(`read ${res.status}`);
  return res.json();
}

export async function acceptConversation(id: string) {
  const res = await rpc().conversations[":id"].accept.$post({ param: { id } });
  return jsonOrThrow<Conversation>(res, "accept");
}
