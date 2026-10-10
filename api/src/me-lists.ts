import { arktypeValidator } from "@hono/arktype-validator";
import { A, O, pipe } from "@mobily/ts-belt";
import { Hono } from "hono";
import { replyAuth, requireAuth, takeAuth } from "./auth";
import { all, one } from "./db";
import {
  audienceFromUser,
  blockedEitherWay,
  followStatus,
  getUser,
  hydrateEvents,
  listVisible,
  str,
  type EventRow,
  type UserRow,
} from "./event";
import { requestLocale } from "./i18n";
import {
  MyEventsQuery,
  UserIdParam,
  invalidParam,
  invalidQuery,
  type Event as EventBody,
  type MyEvent,
} from "./schemas";
import type { Bindings } from "./types";

const err = (
  c: { json: (body: { error: string }, status: 400 | 403 | 404) => Response },
  status: 400 | 403 | 404,
  message: string,
) => c.json({ error: message }, status);

function profileVisible(target: UserRow, viewerId: string, status: string): boolean {
  if (str(target.id) === viewerId) return true;
  if (!Number(target.is_private)) return true;
  return status === "accepted";
}

async function bookmarks(
  c: { env: Bindings; req: { url: string; header: (name: string) => string | undefined } },
  user: UserRow,
  saved: boolean,
) {
  const table = saved ? "event_saves" : "event_likes";
  const rows = await all<{ event_id: string }>(
    c.env.DB,
    `SELECT event_id FROM ${table} WHERE user_id = ? ORDER BY created_at DESC`,
    [str(user.id)],
  );
  const ids = rows.map((r) => r.event_id);
  const locale = requestLocale(new URL(c.req.url), c.req.header("accept-language") ?? null);
  const hydrated = await hydrateEvents(c.env.DB, ids, locale, str(user.id));
  const audience = audienceFromUser(user);
  const blocked = new Map<string, boolean>();
  const events: EventBody[] = [];
  for (const ev of hydrated) {
    const row = await one<EventRow>(c.env.DB, "SELECT * FROM events WHERE id = ? LIMIT 1", [ev.id]);
    if (!row) continue;
    if (await listVisible(c.env.DB, row, audience, user, blocked)) events.push(ev);
  }
  return { events };
}

export const meLists = new Hono<{ Bindings: Bindings }>()
  .get("/me/saved", async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    return c.json(await bookmarks(c, r.value, true));
  })
  .get("/me/likes", async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    return c.json(await bookmarks(c, r.value, false));
  })
  .get("/me/events", arktypeValidator("query", MyEventsQuery, invalidQuery), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    const when = c.req.valid("query").when ?? "";
    if (when && when !== "upcoming" && when !== "past") return err(c, 400, "when must be upcoming or past");
    const rows = await all<EventRow & { signup_id: string; signup_status: string }>(
      c.env.DB,
      `SELECT e.*, es.id AS signup_id, es.status AS signup_status
       FROM event_signups es JOIN events e ON e.id = es.event_id
       WHERE es.user_id = ? ORDER BY e.start_at ASC`,
      [str(r.value.id)],
    );
    const now = new Date().toISOString();
    const locale = requestLocale(new URL(c.req.url), c.req.header("accept-language") ?? null);
    const ids: string[] = [];
    const meta: Array<{ signup_id: string; status: string }> = [];
    for (const row of rows) {
      const host = str(row.host_user_id);
      if (host && (await blockedEitherWay(c.env.DB, str(r.value.id), host))) continue;
      if (when === "upcoming" && str(row.end_at) < now) continue;
      if (when === "past" && str(row.end_at) >= now) continue;
      ids.push(str(row.id));
      meta.push({ signup_id: str(row.signup_id), status: str(row.signup_status) });
    }
    const hydrated = await hydrateEvents(c.env.DB, ids, locale, str(r.value.id));
    const byId = new Map(hydrated.map((e) => [e.id, e]));
    const events: MyEvent[] = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const info = meta[i];
      const event = pipe(O.fromNullable(id), O.flatMap((k) => O.fromNullable(byId.get(k))), O.toNullable);
      if (!event || !info) continue;
      events.push({ signup_id: info.signup_id, status: info.status, event });
    }
    return c.json({ events });
  })
  .get(
    "/users/:id/events",
    arktypeValidator("param", UserIdParam, invalidParam),
    async (c) => {
      const r = takeAuth(await requireAuth(c));
      if (!r.ok) return replyAuth(c, r.error);
      const targetId = c.req.valid("param").id;
      const target = await getUser(c.env.DB, targetId);
      if (!target) return err(c, 404, "user not found");
      if (await blockedEitherWay(c.env.DB, str(r.value.id), targetId)) return err(c, 404, "user not found");
      const status = await followStatus(c.env.DB, str(r.value.id), targetId);
      if (!profileVisible(target, str(r.value.id), status)) return err(c, 403, "profile is private");
      const includeCancelled = str(r.value.id) === targetId ? 1 : 0;
      const rows = await all<EventRow>(
        c.env.DB,
        `SELECT * FROM events WHERE host_user_id = ? AND hidden = 0 AND removed_at IS NULL
         AND (? = 1 OR cancelled = 0)
         ORDER BY start_at ASC, id ASC`,
        [targetId, includeCancelled],
      );
      const locale = requestLocale(new URL(c.req.url), c.req.header("accept-language") ?? null);
      const ids = pipe(
        rows,
        A.filterMap((row) => O.fromFalsy(str(row.id))),
      );
      const events = await hydrateEvents(c.env.DB, [...ids], locale, str(r.value.id));
      return c.json({ events });
    },
  );
