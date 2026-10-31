import { arktypeValidator } from "@hono/arktype-validator";
import type { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { optionalAuth, replyAuth, requireAuth, startEmailOtp, takeAuth, verifyEmailOtp } from "./auth";
import { one, run } from "./db";
import {
  blockedEitherWay,
  followStatus,
  getUser,
  hydrateEvents,
  loadVisibleEvent,
  str,
  toPublicProfile,
  toUserResponse,
  type EventRow,
  type UserRow,
} from "./event";
import { buildPatch, normalizeCreate } from "./event-form";
import { requestLocale } from "./i18n";
import { ProfileError, patchProfile } from "./profile";
import {
  EmailStart,
  EmailVerify,
  EventIdParam,
  EventWrite,
  PatchMe,
  UserIdParam,
  invalidBody,
  invalidParam,
} from "./schemas";
import type { Bindings } from "./types";

const err = (
  c: { json: (body: { error: string }, status: 400 | 403 | 404 | 409 | 422) => Response },
  status: 400 | 403 | 404 | 409 | 422,
  message: string,
) => c.json({ error: message }, status);

async function eventJSON(db: D1Database, eventId: string, locale: string, viewer: string) {
  const events = await hydrateEvents(db, [eventId], locale, viewer);
  return events[0] ?? {};
}

function canEdit(actor: UserRow, event: EventRow, cancel: boolean): string | null {
  if (!cancel && Number(event.imported)) return "imported events cannot be edited";
  if (str(actor.role) === "admin") return null;
  if (cancel && Number(event.imported)) return "imported events cannot be cancelled";
  if (str(event.host_user_id) !== str(actor.id)) return "only the event host can update this event";
  if (!Number(actor.is_verified)) return "only verified accounts can manage events";
  return null;
}

async function insertEvent(db: D1Database, ev: ReturnType<typeof normalizeCreate> & object) {
  if ("error" in ev) return;
  await run(
    db,
    `INSERT INTO events (
      id, title_i18n, description_i18n, location_i18n, start_at, end_at, type,
      price_cents, external_url, host_user_id, latitude, longitude, district,
      age_min, age_max, age_mode, capacity, recurrence, price_note_i18n, cover_image_url, join_mode,
      session_count, next_session_start_at, next_session_end_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      ev.id, ev.title_i18n, ev.description_i18n, ev.location_i18n, ev.start_at, ev.end_at, ev.event_type,
      ev.price_cents, ev.external_url, ev.host_user_id, ev.latitude, ev.longitude, ev.district || null,
      ev.age_min, ev.age_max, ev.age_mode, ev.capacity, ev.recurrence, ev.price_note_i18n,
      ev.cover_image_url || null, ev.join_mode, ev.start_at, ev.end_at,
    ],
  );
  await run(db, "INSERT INTO event_sessions (event_id, start_at, end_at) VALUES (?, ?, ?)", [ev.id, ev.start_at, ev.end_at]);
}

async function updateEventRow(db: D1Database, ev: ReturnType<typeof buildPatch> & object) {
  if ("error" in ev) return;
  await run(
    db,
    `UPDATE events SET
      title_i18n = ?, description_i18n = ?, location_i18n = ?, start_at = ?, end_at = ?, type = ?,
      price_cents = ?, external_url = ?, latitude = ?, longitude = ?, district = ?,
      age_min = ?, age_max = ?, age_mode = ?, capacity = ?, recurrence = ?, price_note_i18n = ?,
      cover_image_url = ?, join_mode = ?, session_count = 1, next_session_start_at = ?, next_session_end_at = ?,
      updated_at = datetime('now') WHERE id = ?`,
    [
      ev.title_i18n, ev.description_i18n, ev.location_i18n, ev.start_at, ev.end_at, ev.event_type,
      ev.price_cents, ev.external_url, ev.latitude, ev.longitude, ev.district || null,
      ev.age_min, ev.age_max, ev.age_mode, ev.capacity, ev.recurrence, ev.price_note_i18n,
      ev.cover_image_url || null, ev.join_mode, ev.start_at, ev.end_at, ev.id,
    ],
  );
  await run(db, "DELETE FROM event_sessions WHERE event_id = ?", [ev.id]);
  await run(db, "INSERT INTO event_sessions (event_id, start_at, end_at) VALUES (?, ?, ?)", [ev.id, ev.start_at, ev.end_at]);
}

export const writes = new Hono<{ Bindings: Bindings }>()
  .post("/auth/email/start", arktypeValidator("json", EmailStart, invalidBody), async (c) => {
    const r = await startEmailOtp(c, c.req.valid("json").email);
    if (!r.ok) return replyAuth(c, r.error);
    return c.json(r.value);
  })
  .post("/auth/email/verify", arktypeValidator("json", EmailVerify, invalidBody), async (c) => {
    const body = c.req.valid("json");
    const r = await verifyEmailOtp(c, body.email, body.code, body.birthdate ?? "");
    if (!r.ok) return replyAuth(c, r.error);
    return c.json({ token: r.value.token, user: toUserResponse(r.value.user) });
  })
  .get("/me", async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    return c.json(toUserResponse(r.value));
  })
  .patch("/me", arktypeValidator("json", PatchMe, invalidBody), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    try {
      const saved = await patchProfile(c.env.DB, r.value, c.req.valid("json"));
      return c.json(toUserResponse(saved));
    } catch (e) {
      if (e instanceof ProfileError) {
        const status = e.status;
        if (status === 400 || status === 403 || status === 404 || status === 409 || status === 422) {
          return err(c, status, e.message);
        }
      }
      throw e;
    }
  })
  .post("/events", arktypeValidator("json", EventWrite, invalidBody), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    if (!Number(r.value.is_verified) && str(r.value.role) !== "admin") {
      return err(c, 403, "only verified accounts can create events");
    }
    const ev = normalizeCreate(c.req.valid("json"), str(r.value.id));
    if ("error" in ev) return err(c, 400, ev.error);
    await insertEvent(c.env.DB, ev);
    const locale = requestLocale(new URL(c.req.url), c.req.header("accept-language") ?? null);
    return c.json(await eventJSON(c.env.DB, ev.id, locale, str(r.value.id)), 201);
  })
  .patch("/events/:id", arktypeValidator("param", EventIdParam, invalidParam), arktypeValidator("json", EventWrite, invalidBody), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    const { id } = c.req.valid("param");
    const before = await one<EventRow>(c.env.DB, "SELECT * FROM events WHERE id = ? LIMIT 1", [id]);
    if (!before) return err(c, 404, "event not found");
    const denied = canEdit(r.value, before, false);
    if (denied) return err(c, 403, denied);
    const patch = buildPatch(before, c.req.valid("json"));
    if ("error" in patch) return err(c, 400, patch.error);
    await updateEventRow(c.env.DB, patch);
    const locale = requestLocale(new URL(c.req.url), c.req.header("accept-language") ?? null);
    return c.json(await eventJSON(c.env.DB, id, locale, str(r.value.id)));
  })
  .post("/events/:id/like", arktypeValidator("param", EventIdParam, invalidParam), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    const { id } = c.req.valid("param");
    const event = await loadVisibleEvent(c.env.DB, id, r.value);
    if (!event) return err(c, 404, "event not found");
    await run(c.env.DB, "INSERT INTO event_likes (user_id, event_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [
      str(r.value.id),
      id,
    ]);
    return c.json({ liked: true });
  })
  .delete("/events/:id/like", arktypeValidator("param", EventIdParam, invalidParam), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    await run(c.env.DB, "DELETE FROM event_likes WHERE user_id = ? AND event_id = ?", [str(r.value.id), c.req.valid("param").id]);
    return c.json({ liked: false });
  })
  .post("/events/:id/save", arktypeValidator("param", EventIdParam, invalidParam), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    const { id } = c.req.valid("param");
    const event = await loadVisibleEvent(c.env.DB, id, r.value);
    if (!event) return err(c, 404, "event not found");
    await run(c.env.DB, "INSERT INTO event_saves (user_id, event_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [
      str(r.value.id),
      id,
    ]);
    return c.json({ saved: true });
  })
  .delete("/events/:id/save", arktypeValidator("param", EventIdParam, invalidParam), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    await run(c.env.DB, "DELETE FROM event_saves WHERE user_id = ? AND event_id = ?", [str(r.value.id), c.req.valid("param").id]);
    return c.json({ saved: false });
  })
  .post("/events/:id/share", arktypeValidator("param", EventIdParam, invalidParam), async (c) => {
    const r = takeAuth(await optionalAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    const { id } = c.req.valid("param");
    const event = await loadVisibleEvent(c.env.DB, id, r.value);
    if (!event) return err(c, 404, "event not found");
    await run(c.env.DB, "INSERT INTO event_shares (id, event_id, user_id) VALUES (?, ?, ?)", [
      crypto.randomUUID(),
      id,
      r.value ? str(r.value.id) : null,
    ]);
    return c.json({ shared: true });
  })
  .post("/users/:id/follow", arktypeValidator("param", UserIdParam, invalidParam), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    const targetId = c.req.valid("param").id;
    if (targetId === str(r.value.id)) return err(c, 400, "cannot follow yourself");
    const target = await getUser(c.env.DB, targetId);
    if (!target || str(target.banned_at)) return err(c, 404, "user not found");
    if (await blockedEitherWay(c.env.DB, str(r.value.id), targetId)) return err(c, 404, "user not found");
    const existing = await one<{ status: string; follower_id: string; followee_id: string }>(
      c.env.DB,
      "SELECT status, follower_id, followee_id FROM follows WHERE follower_id = ? AND followee_id = ? LIMIT 1",
      [str(r.value.id), targetId],
    );
    if (existing) {
      return c.json({ status: existing.status, follower_id: existing.follower_id, followee_id: existing.followee_id });
    }
    const status = Number(target.is_private) ? "pending" : "accepted";
    await run(c.env.DB, "INSERT INTO follows (follower_id, followee_id, status) VALUES (?, ?, ?)", [
      str(r.value.id),
      targetId,
      status,
    ]);
    return c.json({ status, follower_id: str(r.value.id), followee_id: targetId }, 201);
  })
  .delete("/users/:id/follow", arktypeValidator("param", UserIdParam, invalidParam), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    const targetId = c.req.valid("param").id;
    const target = await getUser(c.env.DB, targetId);
    if (!target || str(target.banned_at)) return err(c, 404, "user not found");
    if (await blockedEitherWay(c.env.DB, str(r.value.id), targetId)) return err(c, 404, "user not found");
    await run(c.env.DB, "DELETE FROM follows WHERE follower_id = ? AND followee_id = ?", [str(r.value.id), targetId]);
    return c.json({ status: "unfollowed", follower_id: str(r.value.id), followee_id: targetId });
  })
  .get("/users/:id", arktypeValidator("param", UserIdParam, invalidParam), async (c) => {
    const r = takeAuth(await requireAuth(c));
    if (!r.ok) return replyAuth(c, r.error);
    const targetId = c.req.valid("param").id;
    const target = await getUser(c.env.DB, targetId);
    if (!target || str(target.banned_at)) return err(c, 404, "user not found");
    if (await blockedEitherWay(c.env.DB, str(r.value.id), targetId)) return err(c, 404, "user not found");
    const status = await followStatus(c.env.DB, str(r.value.id), targetId);
    const includeBio = str(target.id) === str(r.value.id) || !Number(target.is_private) || status === "accepted";
    return c.json(toPublicProfile(target, status === "none" ? "" : status, includeBio));
  });
