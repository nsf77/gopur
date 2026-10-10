import { arktypeValidator } from "@hono/arktype-validator";
import { type } from "arktype";
import { Hono } from "hono";
import { invalidQuery } from "../schemas";
import type { Bindings } from "../types";
import { ErrBusy, ErrUnknownSource } from "./errors";
import { httpFetcher } from "./fetch";
import { ImportService, type RunState } from "./service";
import { adapters } from "./sources/registry";
import { sourceTimeoutMs } from "./timeout";
import { tokenMatch } from "./token";

const WAIT_CAP_MS = 10 * 60_000;

const ImportQuery = type({
  "source?": "string",
  "wait?": "string",
});

function authorize(env: Bindings, header: string | undefined): { status: 401 | 404; error: string } | null {
  const token = (env.IMPORT_TOKEN ?? "").trim();
  if (!token) return { status: 404, error: "not found" };
  if (!tokenMatch(header ?? "", token)) return { status: 401, error: "unauthorized" };
  return null;
}

function serializeRun(s: RunState): Record<string, unknown> {
  const sources: Record<string, Record<string, unknown>> = {};
  for (const [k, c] of Object.entries(s.sources ?? {})) {
    const row: Record<string, unknown> = {
      fetched: c.fetched,
      created: c.created,
      updated: c.updated,
      unchanged: c.unchanged,
      hidden: c.hidden,
      errors: c.errors,
      duration_ms: c.duration_ms,
    };
    if (c.deduped) row.deduped = c.deduped;
    if (c.error) row.error = c.error;
    sources[k] = row;
  }
  const out: Record<string, unknown> = {};
  if (s.id) out.id = s.id;
  out.status = s.status;
  if (s.started_at) out.started_at = s.started_at;
  if (s.finished_at) out.finished_at = s.finished_at;
  out.sources = sources;
  return out;
}

export function createService(env: Bindings): ImportService {
  return new ImportService(
    env.DB,
    adapters(() => new Date()),
    () => new Date(),
    httpFetcher(),
    sourceTimeoutMs(env.IMPORT_SOURCE_TIMEOUT),
  );
}

export async function runScheduledImport(env: Bindings): Promise<RunState> {
  const svc = createService(env);
  const { done } = await svc.begin("");
  return done;
}

export const imports = new Hono<{ Bindings: Bindings }>()
  .get("/import/status", async (c) => {
    const denied = authorize(c.env, c.req.header("X-Import-Token"));
    if (denied) return c.json({ error: denied.error }, denied.status);
    const svc = createService(c.env);
    return c.json(serializeRun(await svc.status()));
  })
  .get("/internal/import/status", async (c) => {
    const denied = authorize(c.env, c.req.header("X-Import-Token"));
    if (denied) return c.json({ error: denied.error }, denied.status);
    const svc = createService(c.env);
    return c.json(serializeRun(await svc.status()));
  })
  .post("/import/run", arktypeValidator("query", ImportQuery, invalidQuery), (c) => startImport(c))
  .post("/internal/import", arktypeValidator("query", ImportQuery, invalidQuery), (c) => startImport(c));

async function startImport(c: {
  env: Bindings;
  req: { valid: (k: "query") => { source?: string; wait?: string }; header: (n: string) => string | undefined };
  json: (body: unknown, status?: 200 | 202 | 400 | 401 | 404 | 409 | 500) => Response;
}): Promise<Response> {
  const denied = authorize(c.env, c.req.header("X-Import-Token"));
  if (denied) return c.json({ error: denied.error }, denied.status);
  const q = c.req.valid("query");
  const source = (q.source ?? "").trim();
  const svc = createService(c.env);
  if (source && !svc.hasSource(source)) return c.json({ error: "unknown source" }, 400);
  let started: { state: RunState; done: Promise<RunState> };
  try {
    started = await svc.begin(source);
  } catch (e) {
    if (e === ErrBusy) return c.json({ error: "import already running" }, 409);
    if (e === ErrUnknownSource) return c.json({ error: "unknown source" }, 400);
    return c.json({ error: "failed to start import" }, 500);
  }
  if (q.wait !== "1") return c.json(serializeRun(started.state), 202);
  const cap = AbortSignal.timeout(WAIT_CAP_MS);
  try {
    const final = await Promise.race([
      started.done,
      new Promise<never>((_, rej) => cap.addEventListener("abort", () => rej(new Error("cap")))),
    ]);
    return c.json(serializeRun(final), 200);
  } catch {
    const cur = await svc.status();
    const state = cur.id === started.state.id ? cur : started.state;
    return c.json(serializeRun(state), 202);
  }
}
