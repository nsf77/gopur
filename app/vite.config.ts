import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import icons from "unplugin-icons/vite";

export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
    icons({ compiler: "solid" }),
  ],
  server: {
    port: 3000,
  },
});
