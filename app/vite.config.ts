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
    // This client-only PWA must pin one browser copy of Solid 2.
    alias: [
      { find: /^solid-js\/web$/, replacement: resolve(root, "node_modules/@solidjs/web/dist/web.js") },
      { find: /^@solidjs\/web$/, replacement: resolve(root, "node_modules/@solidjs/web/dist/web.js") },
      { find: /^solid-js$/, replacement: resolve(root, "node_modules/solid-js/dist/solid.js") },
    ],
    dedupe: ["solid-js", "@solidjs/web", "@solidjs/signals"],
  },
  server: {
    port: 3000,
  },
});
