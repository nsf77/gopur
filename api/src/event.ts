import type { D1Database } from "@cloudflare/workers-types";
import { isTeen, parseBirthdate } from "./age";
import { all, one } from "./db";
import { ageVisible } from "./feed";
import {
  availableLocales,
  districtI18n,
  resolve,
  unmarshal,
} from "./i18n";
import type { Event, EventLiker, EventOrganizer, I18nMap, PriceTier, PublicProfile } from "./schemas";

export type UserRow = Record<string, unknown>;
export type EventRow = Record<string, unknown>;

const IMPORTED_NOTE = "請以官方頁面為準。 Check the official page for the latest details.";

export function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function bool01(v: unknown): boolean {
  return Number(v) !== 0 && v != null && v !== "";
}

export function parsePriceTiers(raw: unknown): PriceTier[] {
  const s = str(raw).trim();
  if (!s) return [];
  try {
    const parsed: unknown = JSON.parse(s);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t: { cents?: number; label?: string | null }) => ({
      cents: Number(t.cents ?? 0),
      label: t.label ?? null,
    }));
  } catch {
    return [];
  }
}

export function organizerFromUser(user: UserRow | null, hostId: string | null): EventOrganizer | null {
  if (!hostId) return null;
  if (!user) return { id: hostId, is_verified: false, imported: false };
  const out: EventOrganizer = {
    id: str(user.id),
    is_verified: bool01(user.is_verified),
    imported: bool01(user.imported),
  };
  if (str(user.display_name)) out.display_name = str(user.display_name);
  if (str(user.username)) out.username = str(user.username);
  return out;
}

export function toUserResponse(user: UserRow) {
  const birthdate = str(user.birthdate) || undefined;
  let age: number | null = null;
  let teen = false;
  if (birthdate) {
    try {
      age = parseBirthdate(birthdate);
      teen = isTeen(age);
    } catch {
      age = null;
    }
  }
  const missing: string[] = [];
  if (str(user.role) !== "admin" && !bool01(user.imported)) {
    if (!str(user.birthdate).trim()) missing.push("birthdate");
    if (!str(user.username).trim()) missing.push("username");
  }
  const out: {
    id: string;
    language: string;
    age: number | null;
    is_teen: boolean;
    is_private: boolean;
    is_verified: boolean;
    imported: boolean;
    needs_onboarding: boolean;
    onboarding_missing: string[];
    credit_score: number;
    role: string;
    email?: string;
    display_name?: string;
    username?: string;
    phone?: string;
    avatar_url?: string;
    bio?: string;
    birthdate?: string;
  } = {
    id: str(user.id),
    language: str(user.language) || "zh-Hant",
    age,
    is_teen: teen,
    is_private: bool01(user.is_private),
    is_verified: bool01(user.is_verified),
    imported: bool01(user.imported),
    needs_onboarding: missing.length > 0,
    onboarding_missing: missing,
    credit_score: Number(user.credit_score ?? 0),
    role: str(user.role) || "user",
  };
  if (str(user.email)) out.email = str(user.email);
  if (str(user.display_name)) out.display_name = str(user.display_name);
  if (str(user.username)) out.username = str(user.username);
  if (str(user.phone)) out.phone = str(user.phone);
  if (str(user.avatar_url)) out.avatar_url = str(user.avatar_url);
  if (str(user.bio)) out.bio = str(user.bio);
  if (birthdate) out.birthdate = birthdate;
  return out;
}

export function toPublicProfile(user: UserRow, followStatus: string, includeBio: boolean): PublicProfile {
  const out: PublicProfile = {
    id: str(user.id),
    is_private: bool01(user.is_private),
    is_verified: bool01(user.is_verified),
    imported: bool01(user.imported),
  };
  if (str(user.username)) out.username = str(user.username);
  if (str(user.display_name)) out.display_name = str(user.display_name);
  if (str(user.avatar_url)) out.avatar_url = str(user.avatar_url);
  if (includeBio && str(user.bio)) out.bio = str(user.bio);
  if (followStatus) out.viewer_follow_status = followStatus;
  return out;
}

export function toEventResponse(event: EventRow, organizer: EventOrganizer | null, locale: string): Event {
  const titleI18n: I18nMap = unmarshal(str(event.title_i18n)) ?? {};
  const descriptionI18n: I18nMap = unmarshal(str(event.description_i18n)) ?? {};
  const locationI18n: I18nMap = unmarshal(str(event.location_i18n)) ?? {};
  const priceNoteI18n: I18nMap = unmarshal(str(event.price_note_i18n)) ?? {};
  let status = str(event.status) || "active";
  if (bool01(event.cancelled)) status = "cancelled";
  const districtLabel = str(event.district);
  const distMap = districtI18n(districtLabel);
  let locales = availableLocales(titleI18n, descriptionI18n, locationI18n, priceNoteI18n);
  if (Object.keys(distMap).length) {
    for (const l of availableLocales(distMap)) {
      if (!locales.includes(l)) locales = [...locales, l];
    }
  }
  const resolvedDistrict = resolve(distMap, locale) || districtLabel;
  let recurrence: unknown = null;
  const rec = str(event.recurrence).trim();
  if (rec) {
    try {
      recurrence = JSON.parse(rec);
    } catch {
      recurrence = null;
    }
  }
  const sessionCount = Number(event.session_count) > 0 ? Number(event.session_count) : 1;
  const nextStart = str(event.next_session_start_at) || str(event.start_at);
  const nextEnd = str(event.next_session_end_at) || str(event.end_at);
  const out: Event = {
    id: str(event.id),
    title: resolve(titleI18n, locale),
    description: resolve(descriptionI18n, locale),
    start_at: str(event.start_at),
    end_at: str(event.end_at),
    location: resolve(locationI18n, locale),
    title_i18n: titleI18n,
    description_i18n: descriptionI18n,
    location_i18n: locationI18n,
    type: str(event.type),
    price_cents: num(event.price_cents),
    price_max_cents: num(event.price_max_cents),
    price_tiers: parsePriceTiers(event.price_tiers),
    price_note: resolve(priceNoteI18n, locale),
    price_note_i18n: priceNoteI18n,
    external_url: str(event.external_url) || null,
    host_user_id: str(event.host_user_id) || null,
    source: str(event.source) || null,
    source_url: str(event.source_url) || null,
    source_url_generic: bool01(event.source_url_generic),
    attribution: str(event.attribution) || null,
    attribution_url: str(event.attribution_url) || null,
    date_tbc: bool01(event.date_tbc),
    official_note: bool01(event.imported) ? IMPORTED_NOTE : null,
    imported: bool01(event.imported),
    status,
    latitude: num(event.latitude),
    longitude: num(event.longitude),
    district: resolvedDistrict || null,
    district_i18n: distMap,
    available_locales: locales,
    age_min: num(event.age_min),
    age_max: num(event.age_max),
    age_mode: str(event.age_mode) || "suggested",
    capacity: num(event.capacity),
    going_count: 0,
    like_count: 0,
    save_count: 0,
    share_count: 0,
    liked_by_me: false,
    saved_by_me: false,
    liked_by: [],
    recurrence,
    cover_image_url: str(event.cover_image_url) || null,
    join_mode: str(event.join_mode) || "approval",
    organizer,
    session_count: sessionCount,
    next_session: nextStart && nextEnd ? { start_at: nextStart, end_at: nextEnd } : null,
  };
  if (str(event.detail_url)) out.detail_url = str(event.detail_url);
  return out;
}

export async function getUser(db: D1Database, id: string): Promise<UserRow | null> {
  return one<UserRow>(db, "SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
}

export async function followStatus(db: D1Database, viewerId: string, targetId: string): Promise<string> {
  if (viewerId === targetId) return "self";
  const row = await one<{ status: string }>(
    db,
    "SELECT status FROM follows WHERE follower_id = ? AND followee_id = ? LIMIT 1",
    [viewerId, targetId],
  );
  return row?.status ?? "none";
}

export async function blockedEitherWay(db: D1Database, a: string, b: string): Promise<boolean> {
  const row = await one(
    db,
    `SELECT 1 AS ok FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`,
    [a, b, b, a],
  );
  return !!row;
}

export type Audience = { authenticated: boolean; age: number; ageKnown: boolean; isTeen: boolean };

export function audienceFromUser(user: UserRow | null): Audience {
  if (!user) return { authenticated: false, age: 18, ageKnown: false, isTeen: false };
  const out: Audience = { authenticated: true, age: 18, ageKnown: false, isTeen: false };
  const bd = str(user.birthdate);
  if (!bd) return out;
  try {
    out.age = parseBirthdate(bd);
    out.ageKnown = true;
    out.isTeen = isTeen(out.age);
  } catch {
    /* ignore */
  }
  return out;
}

export async function listVisible(
  db: D1Database,
  event: EventRow,
  audience: Audience,
  viewer: UserRow | null,
  blockedCache: Map<string, boolean>,
): Promise<boolean> {
  const host = str(event.host_user_id);
  const viewerId = viewer ? str(viewer.id) : "";
  if (viewerId && host && host === viewerId) return true;
  if (viewerId && host) {
    let blocked = blockedCache.get(host);
    if (blocked === undefined) {
      blocked = await blockedEitherWay(db, viewerId, host);
      blockedCache.set(host, blocked);
    }
    if (blocked) return false;
  }
  return ageVisible(num(event.age_min), num(event.age_max), str(event.age_mode) || "suggested", audience);
}

export async function loadVisibleEvent(
  db: D1Database,
  id: string,
  viewer: UserRow | null,
): Promise<EventRow | null> {
  const event = await one<EventRow>(
    db,
    `SELECT events.* FROM events WHERE events.id = ? AND events.hidden = 0 AND events.removed_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM users banned_host WHERE banned_host.id = events.host_user_id AND banned_host.banned_at IS NOT NULL)
     LIMIT 1`,
    [id],
  );
  if (!event) return null;
  const audience = audienceFromUser(viewer);
  if (!(await listVisible(db, event, audience, viewer, new Map()))) return null;
  return event;
}

export async function attachSocial(db: D1Database, viewerId: string, events: Event[]): Promise<void> {
  if (events.length === 0) return;
  const ids = events.map((e) => e.id);
  const ph = ids.map(() => "?").join(",");
  const counts = await all<{ id: string; like_count: number; save_count: number; share_count: number }>(
    db,
    `SELECT id, like_count, save_count, share_count FROM events WHERE id IN (${ph})`,
    ids,
  );
  const byId = new Map(events.map((e, i) => [e.id, i]));
  for (const row of counts) {
    const i = byId.get(row.id);
    if (i == null) continue;
    const ev = events[i];
    if (!ev) continue;
    ev.like_count = Number(row.like_count);
    ev.save_count = Number(row.save_count);
    ev.share_count = Number(row.share_count);
  }
  if (viewerId) {
    const liked = await all<{ event_id: string }>(
      db,
      `SELECT event_id FROM event_likes WHERE user_id = ? AND event_id IN (${ph})`,
      [viewerId, ...ids],
    );
    for (const row of liked) {
      const i = byId.get(row.event_id);
      const ev = i != null ? events[i] : undefined;
      if (ev) ev.liked_by_me = true;
    }
    const saved = await all<{ event_id: string }>(
      db,
      `SELECT event_id FROM event_saves WHERE user_id = ? AND event_id IN (${ph})`,
      [viewerId, ...ids],
    );
    for (const row of saved) {
      const i = byId.get(row.event_id);
      const ev = i != null ? events[i] : undefined;
      if (ev) ev.saved_by_me = true;
    }
  }
  const now = new Date().toISOString();
  const previews = await all<{
    event_id: string;
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }>(
    db,
    `SELECT event_id, id, username, display_name, avatar_url FROM (
  SELECT
    l.event_id, u.id, u.username, u.display_name, u.avatar_url,
    ROW_NUMBER() OVER (
      PARTITION BY l.event_id
      ORDER BY CASE
        WHEN ? != '' AND EXISTS (
          SELECT 1 FROM follows f
          WHERE f.follower_id = ? AND f.followee_id = l.user_id AND f.status = 'accepted'
        ) THEN 0 ELSE 1 END ASC,
        l.created_at DESC, l.user_id DESC
    ) AS rn
  FROM event_likes l
  JOIN users u ON u.id = l.user_id
  WHERE l.event_id IN (${ph})
    AND u.banned_at IS NULL
    AND (u.suspended_until IS NULL OR u.suspended_until = '' OR u.suspended_until < ?)
    AND (? = '' OR NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = ? AND b.blocked_id = l.user_id)
         OR (b.blocker_id = l.user_id AND b.blocked_id = ?)
    ))
    AND (
      u.is_private = 0 OR l.user_id = ?
      OR (? != '' AND EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = ? AND f.followee_id = l.user_id AND f.status = 'accepted'
      ))
    )
)
WHERE rn <= 2
ORDER BY event_id, rn`,
    [viewerId, viewerId, ...ids, now, viewerId, viewerId, viewerId, viewerId, viewerId, viewerId],
  );
  for (const ev of events) ev.liked_by = [];
  for (const row of previews) {
    const i = byId.get(row.event_id);
    const ev = i != null ? events[i] : undefined;
    if (!ev) continue;
    const liker: EventLiker = { id: row.id };
    if (row.username) liker.username = row.username;
    if (row.display_name) liker.display_name = row.display_name;
    if (row.avatar_url) liker.avatar_url = row.avatar_url;
    ev.liked_by.push(liker);
  }
}

export async function goingCounts(db: D1Database): Promise<Map<string, number>> {
  const rows = await all<{ event_id: string; going_count: number }>(
    db,
    `SELECT event_id, COUNT(*) AS going_count FROM event_signups
     WHERE status IN ('confirmed', 'attended', 'no_show') GROUP BY event_id`,
  );
  return new Map(rows.map((r) => [r.event_id, Number(r.going_count)]));
}

export async function hydrateEvents(
  db: D1Database,
  ids: string[],
  locale: string,
  viewerId: string,
): Promise<Event[]> {
  if (ids.length === 0) return [];
  const ph = ids.map(() => "?").join(",");
  const rows = await all<EventRow>(
    db,
    `SELECT e.*, u.display_name AS organizer_display_name, u.username AS organizer_username,
            u.is_verified AS organizer_is_verified, COALESCE(u.imported, 0) AS organizer_imported
     FROM events e LEFT JOIN users u ON u.id = e.host_user_id
     WHERE e.id IN (${ph})`,
    ids,
  );
  const byId = new Map(rows.map((r) => [str(r.id), r]));
  const going = await goingCounts(db);
  const out: Event[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    const org = organizerFromUser(
      str(row.host_user_id)
        ? {
            id: row.host_user_id,
            display_name: row.organizer_display_name,
            username: row.organizer_username,
            is_verified: row.organizer_is_verified,
            imported: row.organizer_imported,
          }
        : null,
      str(row.host_user_id) || null,
    );
    const item = toEventResponse(row, org, locale);
    item.going_count = going.get(str(row.id)) ?? 0;
    out.push(item);
  }
  await attachSocial(db, viewerId, out);
  return out;
}
