import { Hono } from "hono";
import { createAuth } from "./better-auth";
import { ChatHub } from "./chat-hub";
import { handleChatUpgrade } from "./chat-ws";
import { api } from "./index";
import { runScheduledImport } from "./importer/http";
import type { Bindings } from "./types";

export { ChatHub };

function isChatUpgrade(pathname: string): boolean {
  return pathname === "/ws" || pathname === "/api/ws";
}

function isApi(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

const hono = new Hono<{ Bindings: Bindings }>()
  .all("/api/auth/*", (c) => createAuth(c.env, c.req.url).handler(c.req.raw))
  .route("/api", api);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (isChatUpgrade(url.pathname)) return handleChatUpgrade(request, env);
    if (isApi(url.pathname)) return hono.fetch(request, env, ctx);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Gopur API", { status: 200, headers: { "content-type": "text/plain" } });
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      runScheduledImport(env).catch((e) => {
        console.error("import cron failed", e);
      }),
    );
  },
} satisfies ExportedHandler<Bindings>;
