import { A, pipe } from "../../lib/belt";
import { apiBase } from "../../lib/api";
import { sessionToken, viewerId } from "../../stores/session";
import { ackEnvelopes, fetchPending, readReceipts, registerDevice, sendMessage } from "./api";
import { ingestEnvelope } from "./envelopes";
import { flushOutbox } from "./outbox";
import { asChatEnvelope } from "./schemas";
import { getDeviceId, markConversationRead } from "./store";

let deviceId: string | null = null;
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

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
  const envelope = asChatEnvelope(frame);
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
        pending.envelopes,
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
  const nextDevice = await getDeviceId(user);
  if (deviceId === nextDevice && wsOpen()) {
    await pullPending();
    await flushOutbox(user, sendMessage);
    return;
  }
  deviceId = nextDevice;
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
