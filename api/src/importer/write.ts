import type { D1Database } from "@cloudflare/workers-types";
import { marshal, LOCALE_EN, LOCALE_ZH } from "../i18n";
import { groupKeyFromLocales } from "../organizers";
import { all, batch, bind, type Bindable } from "../db";
import { contentHash } from "./hash";
import { marshalPriceTiers } from "./price-tiers";
import { sessionColumns, storedSessions } from "./sessions";
import { rfc3339Utc } from "./time";
import type { ImportEvent, SourceMeta } from "./types";

export const BATCH_SIZE = 40;
export const HIDE_ABORT_RATIO = 0.2;
export const HIDE_ABORT_MIN_VISIBLE = 20;

export class HideAbortedError extends Error {
  constructor(
    public source: string,
    public wouldHide: number,
    public visible: number,
  ) {
    super(`hide aborted: would hide ${wouldHide}/${visible} visible ${source} events`);
    this.name = "HideAbortedError";
  }
}

const UPSERT_EVENT_SQL = `INSERT INTO events (
    id, title_i18n, description_i18n, location_i18n,
    start_at, end_at, type, price_cents, price_max_cents, price_tiers, external_url, host_user_id,
    source, external_id, content_hash, source_url, source_url_generic, hidden, last_seen_at,
    imported, attribution, status, latitude, longitude, district,
    date_tbc, attribution_url, source_url_override, organizer_i18n, organizer_key,
    session_count, next_session_start_at, next_session_end_at
) VALUES (
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, 0, ?,
    1, ?, 'active', ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?
)
ON CONFLICT(source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
    title_i18n = excluded.title_i18n,
    description_i18n = excluded.description_i18n,
    location_i18n = excluded.location_i18n,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    type = excluded.type,
    price_cents = excluded.price_cents,
    price_max_cents = excluded.price_max_cents,
    price_tiers = excluded.price_tiers,
    external_url = excluded.external_url,
    host_user_id = excluded.host_user_id,
    content_hash = excluded.content_hash,
    source_url = excluded.source_url,
    source_url_generic = excluded.source_url_generic,
    hidden = 0,
    last_seen_at = excluded.last_seen_at,
    imported = 1,
    attribution = excluded.attribution,
    status = 'active',
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    district = excluded.district,
    date_tbc = excluded.date_tbc,
    attribution_url = excluded.attribution_url,
    source_url_override = excluded.source_url_override,
    organizer_i18n = excluded.organizer_i18n,
    organizer_key = excluded.organizer_key,
    session_count = excluded.session_count,
    next_session_start_at = excluded.next_session_start_at,
    next_session_end_at = excluded.next_session_end_at,
    updated_at = datetime('now')
WHERE events.content_hash IS NOT excluded.content_hash
   OR events.hidden != 0
   OR events.status != 'active'`;

const UPDATE_META_SQL = `UPDATE events SET
    start_at = ?, end_at = ?, type = ?, price_cents = ?, price_max_cents = ?, price_tiers = ?,
    external_url = ?, host_user_id = ?, content_hash = ?, source_url = ?, source_url_generic = ?,
    hidden = 0, last_seen_at = ?, imported = 1, attribution = ?, status = 'active',
    latitude = ?, longitude = ?, district = ?, date_tbc = ?, attribution_url = ?,
    source_url_override = ?, organizer_i18n = ?, organizer_key = ?,
    session_count = ?, next_session_start_at = ?, next_session_end_at = ?,
    updated_at = datetime('now')
WHERE id = ?`;

export type StoredRow = {
  id: string;
  hash: string;
  hidden: number;
  status: string;
  overrideUrl: string;
  title: string;
  description: string;
  location: string;
  district: string;
};

export type WriteStats = {
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  textUpdates: number;
  metaUpdates: number;
  errs: string[];
};

type Pending = {
  event: ImportEvent;
  id: string;
  hash: string;
  title: string;
  description: string;
  location: string;
  organizer: string | null;
  organizerKey: string | null;
  isNew: boolean;
  metaOnly: boolean;
};

export async function loadStoredRows(db: D1Database, source: string): Promise<Map<string, StoredRow>> {
  const rows = await all<{
    id: string;
    ext: string;
    hash: string;
    hidden: number;
    status: string;
    ov: string;
    title: string;
    description: string;
    location: string;
    district: string;
  }>(
    db,
    `SELECT id, external_id AS ext, IFNULL(content_hash,'') AS hash, hidden, status,
            IFNULL(source_url_override,'') AS ov, title_i18n AS title, description_i18n AS description,
            location_i18n AS location, IFNULL(district,'') AS district
     FROM events WHERE source = ? AND imported = 1 AND external_id IS NOT NULL`,
    [source],
  );
  const out = new Map<string, StoredRow>();
  for (const r of rows) {
    out.set(r.ext, {
      id: r.id,
      hash: r.hash,
      hidden: r.hidden,
      status: r.status,
      overrideUrl: r.ov,
      title: r.title,
      description: r.description,
      location: r.location,
      district: r.district,
    });
  }
  return out;
}

function applyOverride(overrideUrl: string, event: ImportEvent): void {
  if (!overrideUrl) return;
  event.sourceUrlOverride = overrideUrl;
  event.sourceUrl = overrideUrl;
  event.sourceUrlGeneric = false;
}

function storedOrganizer(m: ImportEvent["organizer"]): { raw: string | null; key: string | null } {
  if (Object.keys(m).length === 0) return { raw: null, key: null };
  const raw = marshal(m);
  const key = groupKeyFromLocales(m[LOCALE_ZH] ?? "", m[LOCALE_EN] ?? "");
  if (!key) return { raw: null, key: null };
  return { raw, key };
}

function hostFor(defaultHost: string, hosts: Record<string, string>, event: ImportEvent): string {
  if (event.ownerUsername && hosts[event.ownerUsername]) return hosts[event.ownerUsername]!;
  return defaultHost;
}

function sessionStmts(db: D1Database, eventId: string, event: ImportEvent) {
  const stmts = [bind(db, "DELETE FROM event_sessions WHERE event_id = ?", [eventId])];
  for (const s of storedSessions(event)) {
    stmts.push(
      bind(db, "INSERT INTO event_sessions (event_id, start_at, end_at) VALUES (?, ?, ?)", [
        eventId,
        rfc3339Utc(s.start),
        rfc3339Utc(s.end),
      ]),
    );
  }
  return stmts;
}

function upsertParams(
  item: Pending,
  hostId: string,
  stamp: string,
): Bindable[] {
  const cols = sessionColumns(item.event);
  return [
    item.id,
    item.title,
    item.description,
    item.location,
    rfc3339Utc(item.event.startAt),
    rfc3339Utc(item.event.endAt),
    item.event.type,
    item.event.priceCents,
    item.event.priceMaxCents,
    marshalPriceTiers(item.event.priceTiers),
    item.event.sourceUrl,
    hostId,
    item.event.source,
    item.event.externalId,
    item.hash,
    item.event.sourceUrl,
    item.event.sourceUrlGeneric ? 1 : 0,
    stamp,
    item.event.attribution,
    item.event.latitude,
    item.event.longitude,
    item.event.district,
    item.event.dateTbc ? 1 : 0,
    item.event.attributionUrl,
    item.event.sourceUrlOverride,
    item.organizer,
    item.organizerKey,
    cols.count,
    cols.nextStart,
    cols.nextEnd,
  ];
}

function metaParams(item: Pending, hostId: string, stamp: string): Bindable[] {
  const cols = sessionColumns(item.event);
  return [
    rfc3339Utc(item.event.startAt),
    rfc3339Utc(item.event.endAt),
    item.event.type,
    item.event.priceCents,
    item.event.priceMaxCents,
    marshalPriceTiers(item.event.priceTiers),
    item.event.sourceUrl,
    hostId,
    item.hash,
    item.event.sourceUrl,
    item.event.sourceUrlGeneric ? 1 : 0,
    stamp,
    item.event.attribution,
    item.event.latitude,
    item.event.longitude,
    item.event.district,
    item.event.dateTbc ? 1 : 0,
    item.event.attributionUrl,
    item.event.sourceUrlOverride,
    item.organizer,
    item.organizerKey,
    cols.count,
    cols.nextStart,
    cols.nextEnd,
    item.id,
  ];
}

async function writePendingBatch(
  db: D1Database,
  defaultHost: string,
  hosts: Record<string, string>,
  stamp: string,
  batchItems: Pending[],
): Promise<{ created: number; updated: number; unchanged: number; textUpdates: number; metaUpdates: number }> {
  let created = 0,
    updated = 0,
    unchanged = 0,
    textUpdates = 0,
    metaUpdates = 0;
  const writes = batchItems.map((item) => {
    const hostId = hostFor(defaultHost, hosts, item.event);
    if (item.metaOnly) return bind(db, UPDATE_META_SQL, metaParams(item, hostId, stamp));
    return bind(db, UPSERT_EVENT_SQL, upsertParams(item, hostId, stamp));
  });
  const results = await batch(db, writes);
  const follow: ReturnType<typeof bind>[] = [];
  for (let i = 0; i < batchItems.length; i++) {
    const item = batchItems[i]!;
    const wrote = (results[i]?.meta.changes ?? 0) > 0;
    if (wrote) {
      follow.push(
        bind(
          db,
          `INSERT INTO external_events (source, external_id, event_id, content_hash, source_url, hidden, last_seen_at)
           VALUES (?, ?, ?, ?, ?, 0, ?)
           ON CONFLICT(source, external_id) DO UPDATE SET
             event_id = excluded.event_id, content_hash = excluded.content_hash,
             source_url = excluded.source_url, hidden = excluded.hidden, last_seen_at = excluded.last_seen_at`,
          [item.event.source, item.event.externalId, item.id, item.hash, item.event.sourceUrl, stamp],
        ),
        ...sessionStmts(db, item.id, item.event),
      );
    }
    if (!wrote) unchanged++;
    else if (item.isNew) created++;
    else if (item.metaOnly) {
      updated++;
      metaUpdates++;
    } else {
      updated++;
      textUpdates++;
    }
  }
  await batch(db, follow);
  return { created, updated, unchanged, textUpdates, metaUpdates };
}

export async function writeEvents(
  db: D1Database,
  meta: SourceMeta,
  defaultHost: string,
  hosts: Record<string, string>,
  stamp: string,
  events: ImportEvent[],
  afterBatch?: () => Promise<void> | void,
): Promise<WriteStats> {
  const stats: WriteStats = { created: 0, updated: 0, unchanged: 0, failed: 0, textUpdates: 0, metaUpdates: 0, errs: [] };
  if (!events.length) return stats;
  const stored = await loadStoredRows(db, meta.id);
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const pending: Pending[] = [];
    const end = Math.min(i + BATCH_SIZE, events.length);
    for (let j = i; j < end; j++) {
      const event = events[j]!;
      const row = stored.get(event.externalId);
      if (row) applyOverride(row.overrideUrl, event);
      if (
        row &&
        (Number.isNaN(event.startAt.getTime()) ||
          Number.isNaN(event.endAt.getTime()) ||
          event.startAt.getTime() === 0 ||
          event.endAt.getTime() === 0)
      ) {
        stats.unchanged++;
        continue;
      }
      const hash = await contentHash(event);
      if (row && row.hash === hash && row.hidden === 0 && row.status === "active") {
        stats.unchanged++;
        continue;
      }
      const title = marshal(event.title);
      const description = marshal(event.description);
      const location = marshal(event.location);
      const org = storedOrganizer(event.organizer);
      pending.push({
        event,
        id: row?.id ?? crypto.randomUUID(),
        hash,
        title,
        description,
        location,
        organizer: org.raw,
        organizerKey: org.key,
        isNew: !row,
        metaOnly:
          !!row &&
          row.title === title &&
          row.description === description &&
          row.location === location &&
          row.district === event.district,
      });
    }
    if (!pending.length) continue;
    try {
      const w = await writePendingBatch(db, defaultHost, hosts, stamp, pending);
      stats.created += w.created;
      stats.updated += w.updated;
      stats.unchanged += w.unchanged;
      stats.textUpdates += w.textUpdates;
      stats.metaUpdates += w.metaUpdates;
      await afterBatch?.();
    } catch (e) {
      stats.failed += pending.length;
      stats.errs.push(String(e));
      break;
    }
  }
  return stats;
}

export async function hideMissing(db: D1Database, source: string, cutoff: string, seen: Set<string>): Promise<number> {
  const rows = await all<{ id: string; ext: string; end_at: string; status: string }>(
    db,
    `SELECT id, external_id AS ext, end_at, status FROM events
     WHERE source = ? AND imported = 1 AND hidden = 0 AND external_id IS NOT NULL`,
    [source],
  );
  const future: string[] = [];
  const past: string[] = [];
  for (const r of rows) {
    if (seen.has(r.ext)) continue;
    if (r.end_at > cutoff) future.push(r.id);
    else if (r.status === "active") past.push(r.id);
  }
  const visible = rows.length;
  if (visible >= HIDE_ABORT_MIN_VISIBLE && future.length / visible > HIDE_ABORT_RATIO) {
    throw new HideAbortedError(source, future.length, visible);
  }
  let hidden = 0;
  for (let start = 0; start < future.length || start < past.length; start += BATCH_SIZE) {
    const futureBatch = future.slice(start, start + BATCH_SIZE);
    const pastBatch = past.slice(start, start + BATCH_SIZE);
    const stmts = [
      ...futureBatch.flatMap((id) => [
        bind(db, `UPDATE events SET hidden = 1, status = 'hidden', updated_at = datetime('now') WHERE id = ? AND hidden = 0`, [id]),
        bind(db, `UPDATE external_events SET hidden = 1 WHERE event_id = ?`, [id]),
      ]),
      ...pastBatch.map((id) =>
        bind(
          db,
          `UPDATE events SET status = 'past', updated_at = datetime('now') WHERE id = ? AND hidden = 0 AND status = 'active'`,
          [id],
        ),
      ),
    ];
    await batch(db, stmts);
    hidden += futureBatch.length;
  }
  return hidden;
}
