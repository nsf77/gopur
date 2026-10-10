import type { DurableObjectState } from "@cloudflare/workers-types";
import { handleWsClient, pendingEnvelopes, pushToHub } from "./chat-relay";
import { loadChatSocketUser } from "./chat-ws";
import type { Bindings } from "./types";

type Attachment = { userId: string; deviceId: string };

export class ChatHub {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Bindings,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/push") {
      const items = (await request.json()) as Array<{ device_id?: string; frame: unknown }>;
      this.dispatch(items);
      return new Response("ok");
    }
    if ((request.headers.get("upgrade") ?? "").toLowerCase() !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const loaded = await loadChatSocketUser(request, this.env);
    if (loaded instanceof Response) return loaded;
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ userId: loaded.userId, deviceId: loaded.deviceId } satisfies Attachment);
    this.flushPending(server, loaded.userId, loaded.deviceId);
    const headers = new Headers();
    if (loaded.subprotocol) headers.set("Sec-WebSocket-Protocol", loaded.subprotocol);
    return new Response(null, { status: 101, webSocket: client, headers });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const att = (ws.deserializeAttachment() ?? {}) as Attachment;
    const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
    if (!raw) {
      ws.close(1008, "unexpected data message");
      return;
    }
    const handled = await handleWsClient(this.env.DB, this.env, att.userId ?? "", att.deviceId ?? "", raw);
    if (!handled.ok) {
      ws.close(1008, "unexpected data message");
      return;
    }
    await pushToHub(this.env, handled.value);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
  }

  private dispatch(items: Array<{ device_id?: string; frame: unknown }>): void {
    for (const ws of this.state.getWebSockets()) {
      const att = (ws.deserializeAttachment() ?? {}) as Attachment;
      for (const item of items) {
        if (item.device_id && att.deviceId && item.device_id !== att.deviceId) continue;
        try {
          ws.send(JSON.stringify(item.frame));
        } catch {
          /* drop */
        }
      }
    }
  }

  private flushPending(ws: WebSocket, userId: string, deviceId: string): void {
    if (!deviceId) return;
    void pendingEnvelopes(this.env.DB, this.env, userId, deviceId).then((r) => {
      if (!r.ok) return;
      for (const frame of r.value) {
        try {
          ws.send(JSON.stringify(frame));
        } catch {
          return;
        }
      }
    });
  }
}
