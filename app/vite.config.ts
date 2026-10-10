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
    alias: [
      { find: "solid-js/web", replacement: resolve(root, "node_modules/@solidjs/web") },
      { find: "solid-js-runtime", replacement: resolve(root, "node_modules/solid-js") },
      { find: /^solid-js$/, replacement: resolve(root, "src/shims/solid-js.ts") },
    ],
    dedupe: ["solid-js", "@solidjs/web"],
  },
  server: {
    port: 3000,
  },
});
