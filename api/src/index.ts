import { arktypeValidator } from "@hono/arktype-validator";
import { O, pipe } from "@mobily/ts-belt";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { optionalAuth, replyAuth, takeAuth, viewerId } from "./auth";
import { decodeBase64Url, encodeBase64Url } from "./base64";
import { all, one } from "./db";
import {
  attachSocial,
  audienceFromUser,
  goingCounts,
  hydrateEvents,
  listVisible,
  loadVisibleEvent,
  organizerFromUser,
  toEventResponse,
  toPublicProfile,
  type EventRow,
  type UserRow,
} from "./event";
import {
  arrange,
  distanceKM,
  encodeCursor,
  feedEligible,
  pageWindow,
  parseTime,
  score,
} from "./feed";
import { feedConfig } from "./feed-config";
import { requestLocale } from "./i18n";
import { aggregate, matches, type Bucket } from "./organizers";
import {
  ErrorBody,
  EventIdParam,
  EventPage,
  ExploreQuery,
  LikersQuery,
  OrganizerKeyParam,
  OrganizersQuery,
  PageQuery,
  SearchEventsQuery,
  invalidParam,
  invalidQuery,
  type Event as EventBody,
} from "./schemas";
import { searchIDs, type SearchQuery } from "./search";
import { matchQuery } from "./searchtext";
import { imports } from "./importer/http";
import { meLists } from "./me-lists";
import { notes } from "./notifications";
import type { Bindings } from "./types";
import { chat } from "./chat";
import { writes } from "./writes";

export type { Bindings } from "./types";

const err = (c: { json: (body: ErrorBody, status: 400 | 404) => Response }, status: 400 | 404, message: string) =>
  c.json({ error: message }, status);

const reads = new Hono<{ Bindings: Bindings }>()
  .use("*", cors())
  .get("/healthz", (c) => c.json({ ok: true as const }))
  .get("/feed", arktypeValidator("query", PageQuery, invalidQuery), async (c) => {
    const v = takeAuth(await optionalAuth(c));
    if (!v.ok) return replyAuth(c, v.error);
    let window: { limit: number; offset: number };
    try {
      window = pageWindow(c.req.valid("query"));
    } catch (e) {
      return err(c, 400, e instanceof Error ? e.message : "invalid cursor");
    }
    const db = c.env.DB;
    const now = new Date();
    const audience = audienceFromUser(v.value);
    const origin = feedConfig.default_location;
    const notBefore = new Date(now.getTime() - 48 * 3600_000).toISOString().slice(0, 10);
    const rows = await all<EventRow>(
      db,
      `WITH pop AS (
    SELECT event_id, SUM(n) AS signals, SUM(going) AS going
    FROM (
        SELECT event_id, COUNT(*) AS n, 0 AS going FROM event_saves GROUP BY event_id
        UNION ALL
        SELECT event_id, COUNT(*) AS n, 0 AS going FROM event_likes GROUP BY event_id
        UNION ALL
        SELECT event_id, COUNT(*) AS n, COUNT(*) AS going FROM event_signups
        WHERE status IN ('confirmed', 'attended', 'no_show') GROUP BY event_id
    ) GROUP BY event_id
)
SELECT e.id, e.start_at, e.end_at, e.type, e.source, e.host_user_id, e.latitude, e.longitude,
       e.age_min, e.age_max, e.age_mode, e.capacity, e.hidden, e.cancelled, e.status, e.date_tbc,
       e.next_session_start_at, e.next_session_end_at,
       COALESCE(u.is_private, 0) AS host_private,
       COALESCE(pop.signals, 0) AS popularity_signals,
       COALESCE(pop.going, 0) AS going_count
FROM events e
LEFT JOIN users u ON u.id = e.host_user_id
LEFT JOIN pop ON pop.event_id = e.id
WHERE e.hidden = 0 AND e.cancelled = 0 AND e.status = 'active' AND e.removed_at IS NULL
  AND u.banned_at IS NULL AND e.end_at >= ?`,
      [notBefore],
    );
    const ranked = [];
    for (const row of rows) {
      const host = String(row.host_user_id ?? "");
      const end = parseTime(String(row.end_at));
      const start = parseTime(String(row.start_at));
      const nextStart = parseTime(String(row.next_session_start_at ?? ""));
      const nextEnd = parseTime(String(row.next_session_end_at ?? ""));
      if (
        !feedEligible({
          hidden: Number(row.hidden) !== 0,
          cancelled: Number(row.cancelled) !== 0,
          status: String(row.status),
          end,
          now,
          capacity: row.capacity == null ? null : Number(row.capacity),
          going: Number(row.going_count),
          blocked: false,
          hostPrivate: Number(row.host_private) !== 0,
          viewerIsHost: false,
          viewerFollowsHost: false,
          ageMin: row.age_min == null ? null : Number(row.age_min),
          ageMax: row.age_max == null ? null : Number(row.age_max),
          ageMode: String(row.age_mode ?? "suggested"),
          audience,
        })
      ) {
        continue;
      }
      let daysUntilStart = 0;
      if (nextStart) daysUntilStart = (nextStart.getTime() - now.getTime()) / 86400000;
      else if (start) daysUntilStart = (start.getTime() - now.getTime()) / 86400000;
      let spanDays = 0;
      if (nextStart && nextEnd && nextEnd > nextStart) spanDays = (nextEnd.getTime() - nextStart.getTime()) / 86400000;
      else if (start && end && end > start) spanDays = (end.getTime() - start.getTime()) / 86400000;
      const lat = row.latitude == null ? null : Number(row.latitude);
      const lng = row.longitude == null ? null : Number(row.longitude);
      ranked.push({
        id: String(row.id),
        hostId: host,
        type: String(row.type),
        startAt: String(row.start_at),
        score: score(feedConfig, {
          hasDistance: lat != null && lng != null,
          distanceKm: lat != null && lng != null ? distanceKM(origin.latitude, origin.longitude, lat, lng) : 0,
          daysUntilStart,
          spanDays,
          followsHost: false,
          popularitySignals: Number(row.popularity_signals),
          age: 18,
          ageMin: row.age_min == null ? null : Number(row.age_min),
          ageMax: row.age_max == null ? null : Number(row.age_max),
          interestShare: 0,
          source: String(row.source ?? ""),
          dateTbc: Number(row.date_tbc) !== 0,
        }),
      });
    }
    const ordered = arrange(ranked, feedConfig.variety_max_same_organizer, feedConfig.variety_max_same_category);
    let offset = window.offset;
    if (offset > ordered.length) offset = ordered.length;
    const page = ordered.slice(offset, offset + window.limit);
    const locale = requestLocale(new URL(c.req.url), c.req.header("accept-language") ?? null);
    const events = await hydrateEvents(
      db,
      page.map((p) => p.id),
      locale,
      viewerId(v.value),
    );
    const scores = new Map(page.map((p) => [p.id, Math.round(p.score * 10) / 10]));
    const out = events.map((ev) => ({ ...ev, score: scores.get(ev.id) ?? 0 }));
    const body: EventPage = { events: out };
    if (offset + window.limit < ordered.length) {
      const next = offset + window.limit;
      body.next_cursor = encodeCursor(next);
      body.next_offset = next;
    }
    return c.json(body);
  })
  .get("/events", arktypeValidator("query", ExploreQuery, invalidQuery), async (c) => {
    const v = takeAuth(await optionalAuth(c));
    if (!v.ok) return replyAuth(c, v.error);
    const q = c.req.valid("query");
    const db = c.env.DB;
    const type = q.type ?? "";
    const from = q.from ?? "";
    const to = q.to ?? "";
    const text = q.q ?? "";
    const rows = await all<EventRow>(
      db,
      `SELECT e.*, u.display_name AS organizer_display_name, u.username AS organizer_username,
              u.is_verified AS organizer_is_verified, COALESCE(u.imported, 0) AS organizer_imported
       FROM events e LEFT JOIN users u ON u.id = e.host_user_id
       WHERE e.hidden = 0 AND e.cancelled = 0 AND e.removed_at IS NULL AND u.banned_at IS NULL
         AND (? = '' OR e.type = ?)
         AND ((? = '' AND ? = '') OR EXISTS (
              SELECT 1 FROM event_sessions s WHERE e.id = s.event_id
                AND (? = '' OR s.end_at > ?) AND (? = '' OR s.start_at <= ?)
         ) OR (
              NOT EXISTS (SELECT 1 FROM event_sessions s0 WHERE e.id = s0.event_id)
              AND (? = '' OR e.end_at > ?) AND (? = '' OR e.start_at <= ?)
         ))
         AND (? = '' OR e.title_i18n LIKE '%' || ? || '%' OR e.description_i18n LIKE '%' || ? || '%')
       ORDER BY COALESCE(
          (SELECT MIN(s.start_at) FROM event_sessions s WHERE e.id = s.event_id
             AND (? = '' OR s.end_at > ?) AND (? = '' OR s.start_at <= ?)),
          e.next_session_start_at, e.start_at) ASC`,
      [
        type, type, from, to, from, from, to, to, from, from, to, to, text, text, text, from, from, to, to,
      ],
    );
    const locale = requestLocale(new URL(c.req.url), c.req.header("accept-language") ?? null);
    const audience = audienceFromUser(v.value);
    const blocked = new Map<string, boolean>();
    const going = await goingCounts(db);
    const events: EventBody[] = [];
    for (const row of rows) {
      if (!(await listVisible(db, row, audience, v.value, blocked))) continue;
      const org = organizerFromUser(
        row.host_user_id
          ? {
              id: row.host_user_id,
              display_name: row.organizer_display_name,
              username: row.organizer_username,
              is_verified: row.organizer_is_verified,
              imported: row.organizer_imported,
            }
          : null,
        row.host_user_id ? String(row.host_user_id) : null,
      );
      const item = toEventResponse(row, org, locale);
      item.going_count = going.get(String(row.id)) ?? 0;
      events.push(item);
    }
    await attachSocial(db, viewerId(v.value), events);
    return c.json({ events });
  })
  .get(
    "/events/:id/likers",
    arktypeValidator("param", EventIdParam, invalidParam),
    arktypeValidator("query", LikersQuery, invalidQuery),
    async (c) => {
      const v = takeAuth(await optionalAuth(c));
      if (!v.ok) return replyAuth(c, v.error);
      const { id } = c.req.valid("param");
      const query = c.req.valid("query");
      const db = c.env.DB;
      const event = await loadVisibleEvent(db, id, v.value);
      if (!event) return err(c, 404, "event not found");
      let limit = 20;
      if (query.limit) {
        const n = Number(query.limit);
        if (!Number.isInteger(n) || n < 1 || n > 50) return err(c, 400, "invalid limit");
        limit = n;
      }
      let cursorT = "";
      let cursorId = "";
      if (query.cursor) {
        try {
          const decoded: unknown = JSON.parse(decodeBase64Url(query.cursor));
          if (!decoded || typeof decoded !== "object") throw new Error("invalid cursor");
          const rec = decoded as { t?: unknown; id?: unknown };
          cursorT = String(rec.t ?? "");
          cursorId = String(rec.id ?? "");
          if (!cursorT || !cursorId) throw new Error("invalid cursor");
        } catch {
          return err(c, 400, "invalid cursor");
        }
      }
      const now = new Date().toISOString();
      const vid = viewerId(v.value);
      const args: Array<string | number | null> = [vid, vid, id, now, vid, vid, vid, vid, vid, vid];
      let cursorSQL = "";
      if (cursorT) {
        cursorSQL = " AND (l.created_at < ? OR (l.created_at = ? AND l.user_id < ?))";
        args.push(cursorT, cursorT, cursorId);
      }
      args.push(limit + 1);
      const rows = await all<{
        id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
        created_at: string;
        followed_by_me: number;
      }>(
        db,
        `SELECT u.id, u.username, u.display_name, u.avatar_url, l.created_at,
  CASE WHEN ? != '' AND EXISTS (
    SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = l.user_id AND f.status = 'accepted'
  ) THEN 1 ELSE 0 END AS followed_by_me
FROM event_likes l JOIN users u ON u.id = l.user_id
WHERE l.event_id = ? AND u.banned_at IS NULL
  AND (u.suspended_until IS NULL OR u.suspended_until = '' OR u.suspended_until < ?)
  AND (? = '' OR NOT EXISTS (
    SELECT 1 FROM blocks b WHERE (b.blocker_id = ? AND b.blocked_id = l.user_id)
       OR (b.blocker_id = l.user_id AND b.blocked_id = ?)
  ))
  AND (u.is_private = 0 OR l.user_id = ? OR (? != '' AND EXISTS (
    SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = l.user_id AND f.status = 'accepted'
  )))` +
          cursorSQL +
          ` ORDER BY l.created_at DESC, l.user_id DESC LIMIT ?`,
        args,
      );
      let next = "";
      let page = rows;
      if (rows.length > limit) {
        const last = rows[limit - 1];
        if (last) {
          next = encodeBase64Url(JSON.stringify({ t: last.created_at, id: last.id }));
          page = rows.slice(0, limit);
        }
      }
      const users = page.map((row) => {
        const u = toPublicProfile(row, "", false);
        u.followed_by_me = Number(row.followed_by_me) !== 0;
        return u;
      });
      return c.json(next ? { users, next_cursor: next } : { users });
    },
  )
  .get("/events/:id", arktypeValidator("param", EventIdParam, invalidParam), async (c) => {
    const v = takeAuth(await optionalAuth(c));
    if (!v.ok) return replyAuth(c, v.error);
    const { id } = c.req.valid("param");
    const db = c.env.DB;
    const event = await loadVisibleEvent(db, id, v.value);
    if (!event) return err(c, 404, "event not found");
    const locale = requestLocale(new URL(c.req.url), c.req.header("accept-language") ?? null);
    const host = event.host_user_id ? await one<UserRow>(db, "SELECT * FROM users WHERE id = ? LIMIT 1", [String(event.host_user_id)]) : null;
    const body = toEventResponse(
      event,
      organizerFromUser(host, event.host_user_id ? String(event.host_user_id) : null),
      locale,
    );
    body.going_count = (await goingCounts(db)).get(String(event.id)) ?? 0;
    const page = [body];
    await attachSocial(db, viewerId(v.value), page);
    const now = new Date().toISOString();
    const sessions = await all<{ start_at: string; end_at: string }>(
      db,
      `SELECT start_at, end_at FROM event_sessions WHERE event_id = ? AND datetime(end_at) > datetime(?) ORDER BY start_at ASC LIMIT 200`,
      [id, now],
    );
    const first = page[0];
    if (first && sessions.length > 0) first.sessions = sessions;
    return c.json(first ?? body);
  })
  .get("/search/events", arktypeValidator("query", SearchEventsQuery, invalidQuery), async (c) => {
    const v = takeAuth(await optionalAuth(c));
    if (!v.ok) return replyAuth(c, v.error);
    const q = c.req.valid("query");
    let window: { limit: number; offset: number };
    try {
      window = pageWindow(q);
    } catch (e) {
      return err(c, 400, e instanceof Error ? e.message : "invalid cursor");
    }
    const db = c.env.DB;
    const audience = audienceFromUser(v.value);
    const origin = feedConfig.default_location;
    const qtext = (q.q ?? "").trim();
    if ([...qtext].length > 80) return err(c, 400, "search query is too long");
    const mq = qtext ? matchQuery(qtext) : { expr: "", ok: false };
    if (qtext && !mq.ok) return c.json({ events: [] });
    const search: SearchQuery = {
      endAfter: new Date().toISOString(),
      viewerId: viewerId(v.value),
      authenticated: !!v.value,
      isTeen: audience.isTeen,
      viewerAge: audience.ageKnown ? audience.age : 18,
      type: q.type ?? "",
      from: q.from ?? "",
      to: q.to ?? "",
      toExclusive: false,
      district: q.district ?? "",
      source: q.source ?? "",
      imported: q.imported ?? "",
      organizer: q.organizer ?? "",
      price: q.price ?? "",
      weekend: q.weekend === "1" || q.weekend === "true",
      filterAge: pipe(O.fromNullable(q.age), O.map(Number), O.toNullable),
      originLat: origin.latitude,
      originLng: origin.longitude,
      useRadius: !!q.radius_km,
      radiusKm: Number(q.radius_km ?? 0),
      match: mq.expr,
      hasText: mq.ok,
      sort: q.sort || (mq.ok ? "relevance" : "soonest"),
      limit: window.limit + 1,
      offset: window.offset,
    };
    const ids = await searchIDs(db, search);
    const hasMore = ids.length > window.limit;
    const pageIds = hasMore ? ids.slice(0, window.limit) : ids;
    const locale = requestLocale(new URL(c.req.url), c.req.header("accept-language") ?? null);
    const events = await hydrateEvents(db, pageIds, locale, viewerId(v.value));
    const body: EventPage = { events };
    if (hasMore) {
      const next = window.offset + window.limit;
      body.next_cursor = encodeCursor(next);
      body.next_offset = next;
    }
    return c.json(body);
  })
  .get("/organizers", arktypeValidator("query", OrganizersQuery, invalidQuery), async (c) => {
    const q = (c.req.valid("query").q ?? "").trim();
    const db = c.env.DB;
    const asOf = new Date().toISOString();
    const buckets = await all<Bucket>(
      db,
      `SELECT e.organizer_key AS organizer_key, COALESCE(e.organizer_i18n, '') AS organizer_i18n,
              COALESCE(e.source, '') AS source, COALESCE(e.attribution_url, '') AS attribution_url,
              COALESCE(u.display_name, '') AS host_display_name, COALESCE(u.id, '') AS host_user_id,
              COUNT(*) AS upcoming_count
       FROM events e LEFT JOIN users u ON u.id = e.host_user_id
       WHERE e.imported = 1 AND e.hidden = 0 AND e.cancelled = 0 AND e.status = 'active'
         AND e.removed_at IS NULL AND u.banned_at IS NULL AND e.end_at > ?
         AND e.organizer_key IS NOT NULL AND e.organizer_key != ''
       GROUP BY e.organizer_key, COALESCE(e.organizer_i18n, ''), COALESCE(e.source, ''),
                COALESCE(e.attribution_url, ''), COALESCE(u.display_name, ''), COALESCE(u.id, '')`,
      [asOf],
    );
    const owners = await all<{ source: string; user_id: string }>(
      db,
      "SELECT source, user_id FROM import_sources ORDER BY source",
    );
    const orgs = (await aggregate(buckets, owners)).filter((o) => matches(o.name, o.name_i18n ?? {}, q));
    const sources = await all<UserRow>(
      db,
      `SELECT u.* FROM users u WHERE u.imported = 1 AND u.banned_at IS NULL
        AND (? = '' OR instr(lower(coalesce(u.username, '')), ?) > 0
             OR instr(lower(coalesce(u.display_name, '')), ?) > 0)
       ORDER BY lower(coalesce(u.display_name, '')), lower(coalesce(u.username, '')), u.id`,
      [q.toLowerCase(), q.toLowerCase(), q.toLowerCase()],
    );
    return c.json({
      sources: sources.map((u) => toPublicProfile(u, "", true)),
      organizers: orgs,
    });
  })
  .get("/organizers/:key", arktypeValidator("param", OrganizerKeyParam, invalidParam), async (c) => {
    const { key } = c.req.valid("param");
    const db = c.env.DB;
    const asOf = new Date().toISOString();
    const buckets = await all<Bucket>(
      db,
      `SELECT e.organizer_key AS organizer_key, COALESCE(e.organizer_i18n, '') AS organizer_i18n,
              COALESCE(e.source, '') AS source, COALESCE(e.attribution_url, '') AS attribution_url,
              COALESCE(u.display_name, '') AS host_display_name, COALESCE(u.id, '') AS host_user_id,
              COUNT(*) AS upcoming_count
       FROM events e LEFT JOIN users u ON u.id = e.host_user_id
       WHERE e.imported = 1 AND e.hidden = 0 AND e.cancelled = 0 AND e.status = 'active'
         AND e.removed_at IS NULL AND u.banned_at IS NULL AND e.end_at > ?
         AND e.organizer_key IS NOT NULL AND e.organizer_key != ''
       GROUP BY e.organizer_key, COALESCE(e.organizer_i18n, ''), COALESCE(e.source, ''),
                COALESCE(e.attribution_url, ''), COALESCE(u.display_name, ''), COALESCE(u.id, '')`,
      [asOf],
    );
    const owners = await all<{ source: string; user_id: string }>(
      db,
      "SELECT source, user_id FROM import_sources ORDER BY source",
    );
    const found = (await aggregate(buckets, owners)).find((o) => o.key === key);
    if (!found) return err(c, 404, "organizer not found");
    return c.json(found);
  });

const api = reads.route("/", writes).route("/", imports).route("/", meLists).route("/", notes).route("/", chat);
export type AppType = typeof api;
/** Serve under /api on go.pur.run and at root on *.workers.dev */
const app = new Hono<{ Bindings: Bindings }>().route("/api", api).route("/", api);
export default app;

export {
  AuthResponse,
  Event,
  EventList,
  EventPage,
  EventWrite,
  FollowState,
  LikeState,
  LikersPage,
  MyEvent,
  MyEventList,
  Notification,
  NotificationList,
  Organizer,
  OrganizerDirectory,
  PatchMe,
  PublicProfile,
  SaveState,
  ShareState,
  UnreadCount,
  User,
} from "./schemas";
