import type { D1Database } from "@cloudflare/workers-types";
import { districtI18n, unmarshal, LOCALE_ZH } from "../i18n";
import { all, one, run } from "../db";
import { emptyEvent, type ImportEvent } from "./types";
import { contentHash } from "./hash";
import { makeKey, titleTcFromI18n, venueFromI18n } from "./sources/dedupe";
import { normalizeSessions, storedSessions } from "./sessions";
import { parseRFC3339 } from "./time";

export async function applyUrbtixDedupe(
  db: D1Database,
  events: ImportEvent[],
): Promise<{ events: ImportEvent[]; deduped: number }> {
  const rows = await all<{ id: string; title: string; start_at: string; loc: string; district: string }>(
    db,
    `SELECT e.id, e.title_i18n AS title, s.start_at AS start_at, e.location_i18n AS loc, IFNULL(e.district,'') AS district
     FROM events e JOIN event_sessions s ON e.id = s.event_id
     WHERE e.source = 'lcsd_cultural' AND e.imported = 1 AND e.hidden = 0 AND e.status = 'active'`,
  );
  const index = new Map<string, string>();
  for (const r of rows) {
    const titleTc = titleTcFromI18n(r.title);
    let venue = venueFromI18n(r.loc);
    if (!venue && r.district) venue = r.district;
    const start = parseRFC3339(r.start_at);
    if (!start) continue;
    const key = makeKey(titleTc, start, venue, venue);
    if (!key.title || !key.date) continue;
    const composite = `${key.title}\0${key.date}`;
    if (!index.has(composite)) index.set(composite, r.id);
  }
  const kept: ImportEvent[] = [];
  let deduped = 0;
  for (const event of events) {
    let titleTc = event.dedupeTitleTc;
    if (!titleTc) titleTc = event.title[LOCALE_ZH] ?? "";
    const remaining = [];
    for (const session of storedSessions(event)) {
      const key = makeKey(titleTc, session.start, event.dedupeVenueTc, event.dedupeVenueEn);
      const matchId = key.title && key.date ? (index.get(`${key.title}\0${key.date}`) ?? "") : "";
      if (!matchId) {
        remaining.push(session);
        continue;
      }
      deduped++;
      await enrichLcsdLink(db, matchId, event);
    }
    if (!remaining.length) continue;
    const norm = normalizeSessions(remaining, new Date(0), new Date(0));
    event.sessions = norm.sessions;
    event.startAt = norm.start;
    event.endAt = norm.end;
    kept.push(event);
  }
  return { events: kept, deduped };
}

async function enrichLcsdLink(db: D1Database, eventId: string, urbtix: ImportEvent): Promise<void> {
  if (!urbtix.sourceUrl || urbtix.sourceUrlGeneric) return;
  const patched = await loadEventForHash(db, eventId);
  if (!patched) return;
  patched.sourceUrl = urbtix.sourceUrl;
  patched.sourceUrlGeneric = false;
  const digest = await contentHash(patched);
  await run(
    db,
    `UPDATE events SET source_url = ?, source_url_generic = 0, source_url_override = ?, external_url = ?, content_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    [urbtix.sourceUrl, urbtix.sourceUrl, urbtix.sourceUrl, digest, eventId],
  );
}

async function loadEventForHash(db: D1Database, eventId: string): Promise<ImportEvent | null> {
  const r = await one<Record<string, unknown>>(
    db,
    `SELECT source, external_id, title_i18n, description_i18n, location_i18n, start_at, end_at, type, price_cents,
            IFNULL(source_url,'') AS source_url, source_url_generic, IFNULL(attribution,'') AS attribution,
            IFNULL(attribution_url,'') AS attribution_url, IFNULL(organizer_i18n,'') AS organizer_i18n,
            latitude, longitude, IFNULL(district,'') AS district, date_tbc, IFNULL(source_url_override,'') AS ov
     FROM events WHERE id = ?`,
    [eventId],
  );
  if (!r) return null;
  const ev = emptyEvent();
  ev.source = String(r.source);
  ev.externalId = String(r.external_id);
  ev.title = unmarshal(String(r.title_i18n)) ?? {};
  ev.description = unmarshal(String(r.description_i18n)) ?? {};
  ev.location = unmarshal(String(r.location_i18n)) ?? {};
  ev.startAt = parseRFC3339(String(r.start_at)) ?? new Date(0);
  ev.endAt = parseRFC3339(String(r.end_at)) ?? new Date(0);
  ev.type = String(r.type);
  ev.priceCents = r.price_cents == null ? null : Number(r.price_cents);
  ev.sourceUrl = String(r.source_url);
  ev.sourceUrlGeneric = Number(r.source_url_generic) !== 0;
  ev.attribution = String(r.attribution);
  ev.attributionUrl = String(r.attribution_url);
  ev.organizer = String(r.organizer_i18n) ? (unmarshal(String(r.organizer_i18n)) ?? {}) : {};
  ev.latitude = r.latitude == null ? null : Number(r.latitude);
  ev.longitude = r.longitude == null ? null : Number(r.longitude);
  ev.district = String(r.district);
  ev.districtI18n = ev.district ? districtI18n(ev.district) : {};
  ev.dateTbc = Number(r.date_tbc) !== 0;
  ev.sourceUrlOverride = String(r.ov);
  const sessions = await all<{ start_at: string; end_at: string }>(
    db,
    `SELECT start_at, end_at FROM event_sessions WHERE event_id = ? ORDER BY start_at`,
    [eventId],
  );
  ev.sessions = sessions
    .map((s) => ({ start: parseRFC3339(s.start_at), end: parseRFC3339(s.end_at) }))
    .filter((s): s is { start: Date; end: Date } => !!s.start && !!s.end);
  return ev;
}
