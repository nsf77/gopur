import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://gopur.pur.run",
  output: "static",
  trailingSlash: "always",
  i18n: {
    defaultLocale: "zh-HK",
    locales: ["zh-HK", "en"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
});
