import type { D1Database } from "@cloudflare/workers-types";
import { all, one, run } from "../db";
import { applyUrbtixDedupe } from "./dedupe-run";
import { prepareEvents } from "./event";
import { FetchError, type Fetcher } from "./fetch";
import { ErrBusy, ErrUnknownSource } from "./errors";
import { repointLegacy } from "./repoint";
import type { Adapter } from "./sources/registry";
import { rfc3339Utc, stampNanos } from "./time";
import type { SourceMeta } from "./types";
import { HideAbortedError, hideMissing, writeEvents } from "./write";

export { ErrBusy, ErrUnknownSource };

export type Counts = {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  hidden: number;
  errors: number;
  deduped: number;
  duration_ms: number;
  error: string;
};

export type Report = { sources: Record<string, Counts> };

export type RunState = {
  id?: string;
  status: string;
  started_at?: string;
  finished_at?: string;
  sources: Record<string, Counts>;
};

function emptyCounts(): Counts {
  return { fetched: 0, created: 0, updated: 0, unchanged: 0, hidden: 0, errors: 0, deduped: 0, duration_ms: 0, error: "" };
}

function clip(s: string): string {
  s = s.trim().replaceAll("\n", " ");
  return s.length > 400 ? s.slice(0, 400) : s;
}

function isSoftWwfError(source: string, error: string): boolean {
  return source === "wwf" && error.includes("403");
}

function isWwf403(e: unknown): boolean {
  if (e instanceof FetchError) return e.status.startsWith("403");
  return String(e).includes("403");
}

export class ImportService {
  running = false;
  holder = "";
  hasRun = false;
  current: RunState = { status: "idle", sources: {} };

  constructor(
    public db: D1Database,
    public adapters: Adapter[],
    public now: () => Date = () => new Date(),
    public fetcher: Fetcher,
    public sourceTimeout = 15 * 60_000,
  ) {}

  hasSource(id: string): boolean {
    return this.adapters.some((a) => a.meta().id === id);
  }

  async run(only: string): Promise<Report> {
    const report: Report = { sources: {} };
    only = only.trim();
    if (only && !this.hasSource(only)) throw ErrUnknownSource;
    const refresh = setInterval(() => void this.refreshLeaseRow(), 120_000);
    try {
      for (const adapter of this.adapters) {
        const meta = adapter.meta();
        if (only && meta.id !== only) continue;
        const counts = await this.runSource(adapter);
        report.sources[meta.id] = counts;
        this.noteSource(meta.id, counts);
      }
    } finally {
      clearInterval(refresh);
    }
    return report;
  }

  async begin(only: string): Promise<{ state: RunState; done: Promise<RunState> }> {
    only = only.trim();
    if (only && !this.hasSource(only)) throw ErrUnknownSource;
    const holder = await this.lock();
    const id = crypto.randomUUID();
    const initial: RunState = {
      id,
      status: "running",
      started_at: rfc3339Utc(this.now()),
      sources: {},
    };
    this.hasRun = true;
    this.current = { ...initial, sources: {} };
    const done = this.executeRun(id, only).then((final) => {
      void this.unlock(holder, final);
      return final;
    });
    return { state: { ...initial, sources: {} }, done };
  }

  async status(): Promise<RunState> {
    if (this.hasRun) return structuredClone(this.current);
    return this.statusFromDB();
  }

  private async executeRun(id: string, only: string): Promise<RunState> {
    const report = await this.run(only);
    return this.buildResult(id, report);
  }

  private buildResult(id: string, report: Report): RunState {
    let status = "ok";
    for (const [source, c] of Object.entries(report.sources)) {
      if (c.error && !isSoftWwfError(source, c.error)) status = "error";
    }
    return {
      id,
      status,
      started_at: this.current.id === id ? this.current.started_at : undefined,
      finished_at: rfc3339Utc(this.now()),
      sources: report.sources,
    };
  }

  private noteSource(id: string, counts: Counts): void {
    if (!this.hasRun || this.current.status !== "running") return;
    this.current.sources[id] = counts;
  }

  private async runSource(adapter: Adapter): Promise<Counts> {
    const meta = adapter.meta();
    const started = this.now();
    const wall = Date.now();
    const counts = emptyCounts();
    await this.refreshLeaseRow();
    const finish = async (status: string) => {
      counts.duration_ms = Date.now() - wall;
      await this.recordRun(meta.id, started, counts, status);
      return counts;
    };
    const hostAccounts: Record<string, string> = {};
    if (meta.id === "lcsd_cultural") {
      try {
        const hkpl = { ...meta, username: "hkpl", displayName: "香港公共圖書館 HK Public Libraries" };
        hostAccounts[hkpl.username] = await this.ensureAccount(hkpl);
      } catch (e) {
        counts.errors = 1;
        counts.error = clip(String(e));
        return finish("error");
      }
    }
    if (meta.id === "wwf" && (await this.shouldSkipWWF())) return finish("ok");
    let hostID: string;
    try {
      hostID = await this.ensureAccount(meta);
    } catch (e) {
      counts.errors = 1;
      counts.error = clip(String(e));
      return finish("error");
    }
    const stamp = stampNanos(started);
    const cutoff = rfc3339Utc(started);
    let fetched: { events: import("./types").ImportEvent[]; errors: number };
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.sourceTimeout);
    const timed: Fetcher = {
      get: (url, limit) => this.fetcher.get(url, limit, ac.signal),
    };
    try {
      fetched = await adapter.fetch(timed);
    } catch (e) {
      counts.errors = 1;
      const msg = String(e);
      if (ac.signal.aborted || msg.includes("timed out") || msg.includes("abort")) {
        counts.error = "source timed out";
      } else {
        counts.error = clip(msg);
      }
      // WWF 403: record the source error but do not hide events (we return before hideMissing).
      if (isWwf403(e)) counts.error = clip(msg);
      return finish("error");
    } finally {
      clearTimeout(timer);
    }
    const prepared = await prepareEvents(meta, fetched.events);
    let events = prepared.events;
    if (meta.id === "urbtix") {
      const d = await applyUrbtixDedupe(this.db, events);
      events = d.events;
      counts.deduped = d.deduped;
    }
    counts.fetched = events.length;
    counts.errors += fetched.errors + prepared.skipped;
    const wrote = await writeEvents(this.db, meta, hostID, hostAccounts, stamp, events, () => this.refreshLeaseRow());
    counts.created = wrote.created;
    counts.updated = wrote.updated;
    counts.unchanged = wrote.unchanged;
    counts.errors += wrote.failed;
    if (wrote.failed > 0 || counts.error) {
      if (!counts.error) counts.error = clip(wrote.errs.join(" | ") || "import write failed");
      return finish("error");
    }
    const seen = new Set<string>();
    for (const e of events) seen.add(e.externalId);
    try {
      await repointLegacy(this.db, meta.id, events);
    } catch (e) {
      counts.errors++;
      counts.error = clip(String(e));
      return finish("error");
    }
    try {
      counts.hidden = await hideMissing(this.db, meta.id, cutoff, seen);
    } catch (e) {
      counts.errors++;
      counts.error = clip(e instanceof HideAbortedError ? e.message : String(e));
      return finish("error");
    }
    return finish("ok");
  }

  private async ensureAccount(meta: SourceMeta): Promise<string> {
    const existing = await one<{ user_id: string }>(this.db, `SELECT user_id FROM import_sources WHERE source = ?`, [
      meta.id,
    ]);
    if (existing) return existing.user_id;
    const byName = await one<{ id: string; imported: number }>(
      this.db,
      `SELECT id, imported FROM users WHERE username = ?`,
      [meta.username],
    );
    let userID: string;
    if (byName) {
      if (!byName.imported) throw new Error(`username ${meta.username} belongs to a non-import account`);
      userID = byName.id;
    } else {
      userID = crypto.randomUUID();
      await run(
        this.db,
        `INSERT INTO users (id, display_name, username, language, bio, is_private, is_verified, imported, credit_score)
         VALUES (?, ?, ?, 'zh-Hant', ?, 0, 0, 1, 0)`,
        [userID, meta.displayName, meta.username, meta.attribution || null],
      );
    }
    await run(
      this.db,
      `INSERT INTO import_sources (source, user_id, attribution, dataset_url) VALUES (?, ?, ?, ?)
       ON CONFLICT(source) DO UPDATE SET attribution = excluded.attribution, dataset_url = excluded.dataset_url`,
      [meta.id, userID, meta.attribution, meta.datasetUrl],
    );
    return userID;
  }

  private async shouldSkipWWF(): Promise<boolean> {
    const row = await one<{ finished_at: string }>(
      this.db,
      `SELECT finished_at FROM import_runs WHERE source = 'wwf' AND status = 'ok' ORDER BY rowid DESC LIMIT 1`,
    );
    if (!row?.finished_at) return false;
    const finished = Date.parse(row.finished_at);
    if (Number.isNaN(finished)) return false;
    return this.now().getTime() - finished < 6 * 24 * 3600_000;
  }

  private async recordRun(source: string, started: Date, counts: Counts, status: string): Promise<void> {
    await run(
      this.db,
      `INSERT INTO import_runs (id, source, started_at, finished_at, status, fetched, created_count, updated_count,
        unchanged_count, hidden_count, error_count, error_detail, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        source,
        rfc3339Utc(started),
        rfc3339Utc(this.now()),
        status,
        counts.fetched,
        counts.created,
        counts.updated,
        counts.unchanged,
        counts.hidden,
        counts.errors,
        counts.error || null,
        counts.duration_ms,
      ],
    );
  }

  private async lock(): Promise<string> {
    if (this.running) throw ErrBusy;
    this.running = true;
    const holder = crypto.randomUUID();
    try {
      await this.takeLease(holder);
    } catch (e) {
      if (!this.holder) this.running = false;
      throw e;
    }
    this.holder = holder;
    return holder;
  }

  private async unlock(holder: string, final?: RunState): Promise<void> {
    const past = rfc3339Utc(new Date(this.now().getTime() - 1000));
    try {
      await run(this.db, `UPDATE import_lease SET expires_at = ? WHERE id = 1 AND holder = ?`, [past, holder]);
    } catch {
      /* isolate may already be gone */
    }
    if (this.holder === holder) {
      this.holder = "";
      this.running = false;
    }
    if (final && this.current.id === final.id) {
      this.current = final;
      this.hasRun = true;
    }
  }

  private async takeLease(holder: string): Promise<void> {
    for (let i = 0; i < 3; i++) {
      try {
        await this.takeLeaseOnce(holder);
        return;
      } catch (e) {
        if (e instanceof Error && e.message === "lease race") continue;
        throw e;
      }
    }
    throw ErrBusy;
  }

  private async takeLeaseOnce(holder: string): Promise<void> {
    const expires = rfc3339Utc(new Date(this.now().getTime() + 15 * 60_000));
    const row = await one<{ holder: string; expires_at: string }>(
      this.db,
      `SELECT holder, expires_at FROM import_lease WHERE id = 1`,
    );
    if (!row) {
      try {
        await run(this.db, `INSERT INTO import_lease (id, holder, expires_at) VALUES (1, ?, ?)`, [holder, expires]);
        return;
      } catch (e) {
        if (String(e).includes("UNIQUE") || String(e).includes("CONSTRAINT")) throw new Error("lease race");
        throw e;
      }
    }
    if (!this.leaseStale(row.expires_at)) throw ErrBusy;
    const changes = await run(
      this.db,
      `UPDATE import_lease SET holder = ?, expires_at = ? WHERE id = 1 AND holder = ?`,
      [holder, expires, row.holder],
    );
    if (changes === 0) throw new Error("lease race");
  }

  private leaseStale(expires: string): boolean {
    return expires <= rfc3339Utc(this.now());
  }

  private async refreshLeaseRow(): Promise<void> {
    if (!this.holder) return;
    const expires = rfc3339Utc(new Date(this.now().getTime() + 15 * 60_000));
    try {
      await run(this.db, `UPDATE import_lease SET expires_at = ? WHERE id = 1 AND holder = ?`, [expires, this.holder]);
    } catch {
      /* ignore */
    }
  }

  private async statusFromDB(): Promise<RunState> {
    const state: RunState = { status: "idle", sources: {} };
    const rows = await all<Record<string, unknown>>(
      this.db,
      `SELECT r.source, r.status, r.fetched, r.created_count, r.updated_count,
              r.unchanged_count, r.hidden_count, r.error_count,
              COALESCE(r.error_detail, '') AS detail, COALESCE(r.duration_ms, 0) AS dur,
              r.started_at, COALESCE(r.finished_at, '') AS finished
       FROM import_runs r
       INNER JOIN (SELECT source, MAX(rowid) AS rowid FROM import_runs GROUP BY source) latest
         ON latest.rowid = r.rowid`,
    );
    let seen = false;
    for (const r of rows) {
      seen = true;
      const source = String(r.source);
      const detail = String(r.detail ?? "");
      state.sources[source] = {
        fetched: Number(r.fetched),
        created: Number(r.created_count),
        updated: Number(r.updated_count),
        unchanged: Number(r.unchanged_count),
        hidden: Number(r.hidden_count),
        errors: Number(r.error_count),
        deduped: 0,
        duration_ms: Number(r.dur),
        error: detail,
      };
      const started = String(r.started_at ?? "");
      const finished = String(r.finished ?? "");
      if (started > (state.started_at ?? "")) state.started_at = started;
      if (finished > (state.finished_at ?? "")) state.finished_at = finished;
      if (state.status !== "error") state.status = "ok";
      if ((String(r.status) === "error" || detail) && !isSoftWwfError(source, detail)) state.status = "error";
    }
    if (!seen) state.status = "idle";
    return state;
  }
}
