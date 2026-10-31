import type { D1Database } from "@cloudflare/workers-types";
import { all, batch, bind } from "../db";
import type { ImportEvent } from "./types";
import { BATCH_SIZE, loadStoredRows } from "./write";

export async function repointLegacy(db: D1Database, source: string, events: ImportEvent[]): Promise<number> {
  const stored = await loadStoredRows(db, source);
  const live = new Set(events.map((e) => e.externalId));
  const { exact, prefix } = legacyClaims(events);
  const rows = await all<{ id: string; ext: string }>(
    db,
    `SELECT id, external_id AS ext FROM events WHERE source = ? AND imported = 1 AND external_id IS NOT NULL`,
    [source],
  );
  const moves: Array<{ oldId: string; newId: string }> = [];
  for (const r of rows) {
    if (live.has(r.ext)) continue;
    if (ambiguousClaim(exact, prefix, r.ext)) continue;
    let target = exact.get(r.ext) ?? "";
    if (!target) {
      const i = r.ext.indexOf(":");
      if (i > 0) target = prefix.get(r.ext.slice(0, i)) ?? "";
    }
    if (!target || target === r.ext) continue;
    const row = stored.get(target);
    if (!row || !row.id || row.id === r.id) continue;
    moves.push({ oldId: r.id, newId: row.id });
  }
  let deleted = 0;
  for (let i = 0; i < moves.length; i += BATCH_SIZE) {
    const chunk = moves.slice(i, i + BATCH_SIZE);
    const stmts = chunk.flatMap((mv) => [
      ...moveRefStmts(db, mv.oldId, mv.newId),
      bind(db, "DELETE FROM events WHERE id = ?", [mv.oldId]),
    ]);
    await batch(db, stmts);
    deleted += chunk.length;
  }
  return deleted;
}

function legacyClaims(events: ImportEvent[]): { exact: Map<string, string>; prefix: Map<string, string> } {
  const exact = new Map<string, string>();
  const prefix = new Map<string, string>();
  const badExact = new Set<string>();
  const badPrefix = new Set<string>();
  const claim = (dst: Map<string, string>, bad: Set<string>, key: string, externalId: string) => {
    if (!key || !externalId) return;
    const prev = dst.get(key);
    if (prev && prev !== externalId) {
      bad.add(key);
      return;
    }
    dst.set(key, externalId);
  };
  for (const event of events) {
    for (const id of event.foldedIds) {
      claim(prefix, badPrefix, id, event.externalId);
      if (id !== event.externalId) claim(exact, badExact, id, event.externalId);
    }
    for (const id of event.replaces) {
      if (id !== event.externalId) claim(exact, badExact, id, event.externalId);
    }
  }
  for (const k of badExact) exact.set(k, "");
  for (const k of badPrefix) prefix.set(k, "");
  return { exact, prefix };
}

function ambiguousClaim(exact: Map<string, string>, prefix: Map<string, string>, externalId: string): boolean {
  if (exact.get(externalId) === "") return true;
  const i = externalId.indexOf(":");
  if (i > 0 && prefix.get(externalId.slice(0, i)) === "") return true;
  return false;
}

function moveRefStmts(db: D1Database, oldId: string, newId: string) {
  return [
    bind(
      db,
      `UPDATE event_saves SET event_id = ? WHERE event_id = ? AND user_id NOT IN (SELECT user_id FROM event_saves WHERE event_id = ?)`,
      [newId, oldId, newId],
    ),
    bind(
      db,
      `UPDATE event_likes SET event_id = ? WHERE event_id = ? AND user_id NOT IN (SELECT user_id FROM event_likes WHERE event_id = ?)`,
      [newId, oldId, newId],
    ),
    bind(
      db,
      `UPDATE event_signups SET event_id = ? WHERE event_id = ? AND user_id NOT IN (SELECT user_id FROM event_signups WHERE event_id = ?)`,
      [newId, oldId, newId],
    ),
    bind(db, "UPDATE event_views SET event_id = ? WHERE event_id = ?", [newId, oldId]),
  ];
}
