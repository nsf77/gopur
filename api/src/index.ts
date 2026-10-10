import type { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { cors } from "hono/cors";

export type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>()
  .use("*", cors())
  .get("/healthz", (c) => c.json({ ok: true as const }));

export type AppType = typeof app;
export default app;
