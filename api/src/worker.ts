import app from "./index";
import { ChatHub } from "./chat-hub";
import { handleChatUpgrade } from "./chat-ws";
import { runScheduledImport } from "./importer/http";
import type { Bindings } from "./types";

export { ChatHub };

function isChatUpgrade(pathname: string): boolean {
  return pathname === "/ws" || pathname === "/api/ws";
}

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (isChatUpgrade(url.pathname)) return handleChatUpgrade(request, env);
    return app.fetch(request, env, ctx);
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      runScheduledImport(env).catch((e) => {
        console.error("import cron failed", e);
      }),
    );
  },
} satisfies ExportedHandler<Bindings>;
