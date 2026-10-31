import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://gopur.pur.run",
  output: "static",
  trailingSlash: "never",
  i18n: {
    defaultLocale: "zh-hk",
    locales: ["zh-hk", "en"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
});
