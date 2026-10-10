import { A, pipe } from "@mobily/ts-belt";
import { apiBase } from "../../lib/api";
import { sessionToken, viewerId } from "../../lib/session";
import { ackEnvelopes, fetchPending, readReceipts, registerDevice, sendMessage } from "./api";
import { ingestEnvelope } from "./envelopes";
import { flushOutbox } from "./outbox";
import { getDeviceId, markConversationRead } from "./store";
import type { ChatEnvelope, ChatMessage } from "./types";

let deviceId: string | null = null;
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

function asEnvelope(frame: Record<string, unknown>): ChatEnvelope | null {
  if (typeof frame.id !== "string") return null;
  if (frame.type === "message" && frame.message && typeof frame.message === "object") {
    return {
      type: "message",
      id: frame.id,
      conversation_id: String(frame.conversation_id ?? ""),
      message_id: String(frame.message_id ?? ""),
      created_at: String(frame.created_at ?? ""),
      message: frame.message as ChatMessage,
    };
  }
  if (frame.type === "receipt" && (frame.status === "delivered" || frame.status === "read")) {
    return {
      type: "receipt",
      id: frame.id,
      conversation_id: String(frame.conversation_id ?? ""),
      message_id: String(frame.message_id ?? ""),
      created_at: String(frame.created_at ?? ""),
      status: frame.status,
      at: String(frame.at ?? ""),
    };
  }
  return null;
}

function wsOpen(): boolean {
  return socket?.readyState === WebSocket.OPEN;
}

function sendClientData(payload: { type: string; ids: string[] }): boolean {
  if (!wsOpen() || !socket) return false;
  socket.send(JSON.stringify(payload));
  return true;
}

async function ackDelivered(ids: string[]): Promise<void> {
  if (ids.length === 0 || !deviceId) return;
  if (sendClientData({ type: "ack", ids })) return;
  try {
    await ackEnvelopes(deviceId, ids);
  } catch {
    /* retry on next pull */
  }
}

export async function sendRead(messageIds: string[], conversationId: string): Promise<void> {
  const user = viewerId();
  if (messageIds.length === 0 || !deviceId || !user) return;
  if (sendClientData({ type: "read", ids: messageIds })) {
    await markConversationRead(user, conversationId);
    return;
  }
  try {
    await readReceipts(deviceId, messageIds);
    await markConversationRead(user, conversationId);
  } catch {
    /* ignore */
  }
}

export async function handleRelayFrame(frame: Record<string, unknown>): Promise<void> {
  const user = viewerId();
  if (!user) return;
  const envelope = asEnvelope(frame);
  if (!envelope) return;
  const ackId = await ingestEnvelope(user, user, envelope);
  await ackDelivered([ackId]);
}

export async function pullPending(): Promise<void> {
  const user = viewerId();
  if (!user || !deviceId) return;
  try {
    const pending = await fetchPending(deviceId);
    const ids = await Promise.all(
      pipe(
        pending.envelopes ?? [],
        A.map((envelope) => ingestEnvelope(user, user, envelope)),
      ),
    );
    await ackDelivered(ids);
  } catch {
    /* ignore */
  }
}

function connectSocket(): void {
  const token = sessionToken();
  const user = viewerId();
  if (!token || !user || !deviceId) return;
  socket?.close();
  const base = apiBase().replace(/^http/, "ws");
  const url = `${base}/ws?token=${encodeURIComponent(token)}&device_id=${encodeURIComponent(deviceId)}`;
  const ws = new WebSocket(url);
  socket = ws;
  ws.onmessage = (ev) => {
    try {
      const frame = JSON.parse(String(ev.data)) as Record<string, unknown>;
      void handleRelayFrame(frame);
    } catch {
      /* ignore */
    }
  };
  ws.onopen = () => {
    void flushOutbox(user, sendMessage);
  };
  ws.onclose = () => {
    if (socket === ws) socket = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      void startChatRelay();
    }, 3000);
  };
}

export async function startChatRelay(): Promise<void> {
  const user = viewerId();
  if (!user) return;
  deviceId = await getDeviceId(user);
  try {
    await registerDevice(deviceId);
  } catch {
    /* WS connect also registers */
  }
  connectSocket();
  if (!wsOpen()) await pullPending();
}

export function stopChatRelay(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  socket?.close();
  socket = null;
  deviceId = null;
}
