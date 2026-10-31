import type { D1Database, D1PreparedStatement, D1Result } from "@cloudflare/workers-types";

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

export async function run(db: D1Database, sql: string, params: Bindable[] = []): Promise<number> {
  const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const res = await stmt.run();
  return res.meta.changes ?? 0;
}

export function bind(db: D1Database, sql: string, params: Bindable[] = []): D1PreparedStatement {
  return params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
}

export async function batch(db: D1Database, statements: D1PreparedStatement[]): Promise<D1Result[]> {
  if (statements.length === 0) return [];
  return db.batch(statements);
}

export function placeholders(n: number): string {
  return Array.from({ length: n }, () => "?").join(",");
}
