import { arktypeValidator } from "@hono/arktype-validator";
import { Hono } from "hono";
import { replyAuth, requireAuth, takeAuth } from "./auth";
import { decodeBase64Url, encodeBase64Url } from "./base64";
import { all, one, run } from "./db";
import { str } from "./event";
import {
  NotificationIdParam,
  NotificationsQuery,
  invalidParam,
  invalidQuery,
  type Notification,
  type NotificationList,
} from "./schemas";
import type { Bindings } from "./types";

const err = (
  c: { json: (body: { error: string }, status: 400 | 404) => Response },
  status: 400 | 404,
  message: string,
) => c.json({ error: message }, status);

type NoteRow = {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  data: string;
  read_at: string | null;
  created_at: string;
};

function encodeNoteCursor(createdAt: string, id: string): string {
  return encodeBase64Url(`${createdAt}\n${id}`);
}

function decodeNoteCursor(raw: string): { t: string; id: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return { t: "", id: "" };
  try {
    const text = decodeBase64Url(trimmed);
    const i = text.indexOf("\n");
    if (i < 0) return null;
    const t = text.slice(0, i);
    const id = text.slice(i + 1);
    if (!t || !id || t.includes("\n")) return null;
    return { t, id };
  } catch {
    return null;
  }
}

function asStringRecord(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (v != null) out[k] = String(v);
  }
  return out;
}

export function notificationItem(row: NoteRow): Notification {
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(str(row.data) || "{}");
  } catch {
    parsed = {};
  }
  const readAt = str(row.read_at);
  const out: Notification = {
    id: str(row.id),
    type: str(row.type),
    category: str(row.category),
    title: str(row.title),
    body: str(row.body),
    data: asStringRecord(parsed),
    read: !!readAt,
    created_at: str(row.created_at),
  };
  if (readAt) out.read_at = readAt;
  return out;
}

async function unreadCount(db: Bindings["DB"], userId: string): Promise<number> {
  const row = await one<{ n: number }>(
    db,
    "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL",
    [userId],
  );
  return Number(row?.n ?? 0);
}

export const notes = new Hono<{ Bindings: Bindings }>()
  .get("/notifications/unread-count", async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    return c.json({ count: await unreadCount(c.env.DB, str(r.value.id)) });
  })
  .post("/notifications/read-all", async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    await run(
      c.env.DB,
      "UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL",
      [new Date().toISOString(), str(r.value.id)],
    );
    return c.json({ unread_count: 0 });
  })
  .post(
    "/notifications/:id/read",
    arktypeValidator("param", NotificationIdParam, invalidParam),
    async (c) => {
      const r = takeAuth(await requireAuth(c));
      if (!r.ok) return replyAuth(c, r.error);
      const { id } = c.req.valid("param");
      const row = await one<NoteRow>(
        c.env.DB,
        "SELECT id, type, category, title, body, data, read_at, created_at FROM notifications WHERE id = ? AND user_id = ? LIMIT 1",
        [id, str(r.value.id)],
      );
      if (!row) return err(c, 404, "notification not found");
      if (!str(row.read_at)) {
        await run(c.env.DB, "UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?", [
          new Date().toISOString(),
          id,
          str(r.value.id),
        ]);
      }
      const updated = await one<NoteRow>(
        c.env.DB,
        "SELECT id, type, category, title, body, data, read_at, created_at FROM notifications WHERE id = ? AND user_id = ?",
        [id, str(r.value.id)],
      );
      return c.json(notificationItem(updated ?? row));
    },
  )
  .get("/notifications", arktypeValidator("query", NotificationsQuery, invalidQuery), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    const q = c.req.valid("query");
    let limit = Number(q.limit ?? 30);
    if (!Number.isInteger(limit) || limit <= 0) limit = 30;
    if (limit > 100) limit = 100;
    const cur = decodeNoteCursor(q.cursor ?? "");
    if (!cur) return err(c, 400, "invalid cursor");
    const rows = await all<NoteRow>(
      c.env.DB,
      `SELECT id, type, category, title, body, data, read_at, created_at FROM notifications
       WHERE user_id = ? AND (? = '' OR created_at < ? OR (created_at = ? AND id < ?))
       ORDER BY created_at DESC, id DESC LIMIT ?`,
      [str(r.value.id), cur.t, cur.t, cur.t, cur.id, limit + 1],
    );
    let next = "";
    let page = rows;
    if (rows.length > limit) {
      const last = rows[limit - 1];
      if (last) {
        next = encodeNoteCursor(str(last.created_at), str(last.id));
        page = rows.slice(0, limit);
      }
    }
    const body: NotificationList = {
      notifications: page.map(notificationItem),
      unread_count: await unreadCount(c.env.DB, str(r.value.id)),
    };
    if (next) body.next_cursor = next;
    return c.json(body);
  });
