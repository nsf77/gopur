import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import icons from "unplugin-icons/vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
    icons({ compiler: "solid" }),
  ],
  resolve: {
    // Package `exports` put `worker`/`node` (dist/server.js) ahead of `browser`.
    // This client-only PWA must pin one browser copy of Solid 2; the solid-js
    // shim then adapts Solid 1 APIs still emitted by @ark-ui/solid 6 next.
    alias: [
      { find: /^solid-js\/web$/, replacement: resolve(root, "node_modules/@solidjs/web/dist/web.js") },
      { find: /^@solidjs\/web$/, replacement: resolve(root, "node_modules/@solidjs/web/dist/web.js") },
      { find: /^solid-js\/store$/, replacement: resolve(root, "src/shims/solid-js-store.ts") },
      { find: "solid-js-runtime", replacement: resolve(root, "node_modules/solid-js/dist/solid.js") },
      { find: /^solid-js$/, replacement: resolve(root, "src/shims/solid-js.ts") },
    ],
    dedupe: ["solid-js", "@solidjs/web", "@solidjs/signals"],
  },
  server: {
    port: 3000,
  },
});
