import type { D1Database } from "@cloudflare/workers-types";

export type Bindable = string | number | null;

export async function all<T>(db: D1Database, sql: string, params: Bindable[] = []): Promise<T[]> {
  const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const res = await stmt.all<T>();
  return res.results ?? [];
}

export async function one<T>(db: D1Database, sql: string, params: Bindable[] = []): Promise<T | null> {
  const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const row = await stmt.first<T>();
  return row ?? null;
}

export async function run(db: D1Database, sql: string, params: Bindable[] = []): Promise<void> {
  const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
  await stmt.run();
}
