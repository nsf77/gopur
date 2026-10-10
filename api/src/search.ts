import type { D1Database } from "@cloudflare/workers-types";
import { all, type Bindable } from "./db";

export type SearchQuery = {
  endAfter: string;
  viewerId: string;
  authenticated: boolean;
  isTeen: boolean;
  viewerAge: number;
  type: string;
  from: string;
  to: string;
  toExclusive: boolean;
  district: string;
  source: string;
  imported: string;
  organizer: string;
  price: string;
  weekend: boolean;
  filterAge: number | null;
  originLat: number;
  originLng: number;
  useRadius: boolean;
  radiusKm: number;
  match: string;
  hasText: boolean;
  sort: string;
  limit: number;
  offset: number;
};

export async function searchIDs(db: D1Database, q: SearchQuery): Promise<string[]> {
  if (q.limit <= 0) q.limit = 20;
  if (q.offset < 0) q.offset = 0;
  const { sql, args } = buildQuery(q);
  const rows = await all<{ id: string }>(db, sql, args);
  return rows.map((r) => r.id);
}

const HAVERSINE = `(
  6371.0 * 2.0 * asin(min(1.0, sqrt(
    (sin(((e.latitude - ?) * pi() / 180.0) / 2.0) * sin(((e.latitude - ?) * pi() / 180.0) / 2.0))
    + cos(? * pi() / 180.0) * cos(e.latitude * pi() / 180.0)
      * (sin(((e.longitude - ?) * pi() / 180.0) / 2.0) * sin(((e.longitude - ?) * pi() / 180.0) / 2.0))
  )))
)`;

function sessionMatchSQL(q: SearchQuery): { sql: string; args: Bindable[] } {
  let sql = "e.id = s.event_id";
  const args: Bindable[] = [];
  if (q.from) {
    sql += " AND s.end_at > ?";
    args.push(q.from);
  }
  if (q.to) {
    sql += q.toExclusive ? " AND s.start_at < ?" : " AND s.start_at <= ?";
    args.push(q.to);
  }
  if (q.weekend) {
    sql +=
      " AND CAST(strftime('%w', datetime(substr(s.start_at, 1, 19), '+8 hours')) AS INTEGER) IN (0, 6)";
  }
  return { sql, args };
}

function eventRangeMatchSQL(q: SearchQuery): { sql: string; args: Bindable[] } {
  let sql = "1 = 1";
  const args: Bindable[] = [];
  if (q.from) {
    sql += " AND e.end_at > ?";
    args.push(q.from);
  }
  if (q.to) {
    sql += q.toExclusive ? " AND e.start_at < ?" : " AND e.start_at <= ?";
    args.push(q.to);
  }
  if (q.weekend) {
    sql +=
      " AND CAST(strftime('%w', datetime(substr(e.start_at, 1, 19), '+8 hours')) AS INTEGER) IN (0, 6)";
  }
  return { sql, args };
}

function buildQuery(q: SearchQuery): { sql: string; args: Bindable[] } {
  let sql = "";
  const args: Bindable[] = [];
  if (q.hasText) {
    sql += `WITH hits AS (
  SELECT event_search.rowid AS fts_rowid, bm25(event_search, 0, 5.0, 1.0) AS score
  FROM event_search
  WHERE event_search MATCH ?
)
`;
    args.push(q.match);
  }
  sql += "\nSELECT e.id AS id\n";
  if (q.hasText) {
    sql += `FROM hits
JOIN event_search_ids i ON i.fts_rowid = hits.fts_rowid
JOIN events e ON e.id = i.event_id
`;
  } else {
    sql += "FROM events e\n";
  }
  sql += `LEFT JOIN users u ON u.id = e.host_user_id
WHERE e.hidden = 0
  AND e.cancelled = 0
  AND e.status = 'active'
  AND e.removed_at IS NULL
  AND u.banned_at IS NULL
  AND e.end_at > ?`;
  args.push(q.endAfter);
  if (q.type) {
    sql += " AND e.type = ?";
    args.push(q.type);
  }
  if (q.from || q.to || q.weekend) {
    const pred = sessionMatchSQL(q);
    const fallback = eventRangeMatchSQL(q);
    sql += ` AND (
    EXISTS (SELECT 1 FROM event_sessions s WHERE ${pred.sql})
    OR (
      NOT EXISTS (SELECT 1 FROM event_sessions s0 WHERE e.id = s0.event_id)
      AND ${fallback.sql}
    )
  )`;
    args.push(...pred.args, ...fallback.args);
  }
  if (q.district) {
    sql += " AND e.district = ?";
    args.push(q.district);
  }
  if (q.source) {
    sql += " AND e.source = ?";
    args.push(q.source);
  }
  if (q.imported === "1") sql += " AND e.imported = 1";
  if (q.imported === "0") sql += " AND e.imported = 0";
  if (q.organizer) {
    sql += " AND e.imported = 1 AND e.organizer_key = ?";
    args.push(q.organizer);
  }
  if (q.price === "free") sql += " AND e.price_cents = 0";
  if (q.price === "paid") sql += " AND e.price_cents > 0";
  if (q.from || q.to || q.weekend) sql += " AND e.date_tbc = 0";

  const auth = q.authenticated ? 1 : 0;
  const teen = q.isTeen ? 1 : 0;
  sql += `
  AND (
    ? = 0
    OR (
      (e.age_min IS NOT NULL OR e.age_max IS NOT NULL)
      AND (e.age_min IS NULL OR e.age_min <= ?)
      AND (e.age_max IS NULL OR e.age_max >= ?)
    )
  )
  AND (
    e.age_mode <> 'strict'
    OR (e.age_min IS NULL AND e.age_max IS NULL)
    OR (
      ? = 1
      AND (e.age_min IS NULL OR e.age_min <= ?)
      AND (e.age_max IS NULL OR e.age_max >= ?)
    )
  )`;
  args.push(teen, q.viewerAge, q.viewerAge, auth, q.viewerAge, q.viewerAge);
  const useAge = q.filterAge != null ? 1 : 0;
  const filterAge = q.filterAge ?? 0;
  sql += `
  AND (
    ? = 0
    OR (
      (e.age_min IS NULL OR e.age_min <= ?)
      AND (e.age_max IS NULL OR e.age_max >= ?)
    )
  )`;
  args.push(useAge, filterAge, filterAge);
  sql += `
  AND (
    e.host_user_id IS NULL
    OR COALESCE(u.is_private, 0) = 0
    OR e.host_user_id = ?
    OR EXISTS (
      SELECT 1 FROM follows f
      WHERE f.follower_id = ?
        AND f.followee_id = e.host_user_id
        AND f.status = 'accepted'
    )
  )
  AND (
    ? = ''
    OR e.host_user_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = ? AND b.blocked_id = e.host_user_id)
         OR (b.blocker_id = e.host_user_id AND b.blocked_id = ?)
    )
  )`;
  args.push(q.viewerId, q.viewerId, q.viewerId, q.viewerId, q.viewerId);
  const useRadius = q.useRadius ? 1 : 0;
  sql += `
  AND (
    ? = 0
    OR (
      e.latitude IS NOT NULL
      AND e.longitude IS NOT NULL
      AND ${HAVERSINE} <= ?
    )
  )`;
  args.push(useRadius, q.originLat, q.originLat, q.originLat, q.originLng, q.originLng, q.radiusKm);
  const relevance = q.hasText ? "hits.score" : "SELECT rank FROM event_search WHERE event_id = e.id";
  const sortPred = sessionMatchSQL(q);
  sql += `
ORDER BY
  CASE WHEN ? = 'relevance' THEN (${relevance}
  ) END ASC,
  CASE
    WHEN ? <> 'nearest' THEN 0
    WHEN e.latitude IS NULL OR e.longitude IS NULL THEN 1
    ELSE 0
  END ASC,
  CASE WHEN ? = 'nearest' AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL THEN ${HAVERSINE} END ASC,
  CASE WHEN ? = 'soonest' THEN e.date_tbc END ASC,
  COALESCE(
    (SELECT MIN(s.start_at) FROM event_sessions s WHERE ${sortPred.sql}),
    e.next_session_start_at,
    e.start_at
  ) ASC,
  e.id ASC
LIMIT ? OFFSET ?`;
  args.push(
    q.sort,
    q.sort,
    q.sort,
    q.originLat,
    q.originLat,
    q.originLat,
    q.originLng,
    q.originLng,
    q.sort,
    ...sortPred.args,
    q.limit,
    q.offset,
  );
  return { sql, args };
}
