import handler from "@tanstack/react-start/server-entry";
import { ChatHub, api, handleChatUpgrade, runScheduledImport, type Bindings } from "api/runtime";
import { Hono } from "hono";

export { ChatHub };

const hono = new Hono<{ Bindings: Bindings }>().route("/api", api);

function isChatUpgrade(pathname: string): boolean {
  return pathname === "/ws" || pathname === "/api/ws";
}

function isApi(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export default {
  fetch(request: Request, env: Bindings, ctx: { waitUntil: (p: Promise<unknown>) => void }) {
    const url = new URL(request.url);
    if (isChatUpgrade(url.pathname)) return handleChatUpgrade(request, env);
    if (isApi(url.pathname)) return hono.fetch(request, env, ctx);
    return handler.fetch(request);
  },
  scheduled(_controller: unknown, env: Bindings, ctx: { waitUntil: (p: Promise<unknown>) => void }) {
    ctx.waitUntil(
      runScheduledImport(env).catch((e) => {
        console.error("import cron failed", e);
      }),
    );
  },
};
