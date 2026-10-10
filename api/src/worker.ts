import app from "./index";
import { runScheduledImport } from "./importer/http";
import type { Bindings } from "./types";

export default {
  fetch: (request, env, ctx) => app.fetch(request, env, ctx),
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      runScheduledImport(env).catch((e) => {
        console.error("import cron failed", e);
      }),
    );
  },
} satisfies ExportedHandler<Bindings>;
