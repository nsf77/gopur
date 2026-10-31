export const locales = ["zh-HK", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-HK";
export const APP_URL = "https://go.pur.run";

export function isLocale(value: string | undefined): value is Locale {
  return value === "zh-HK" || value === "en";
}

/** Keep mixed-case `/zh-HK/` — Astro's `getRelativeLocaleUrl` lowercases it. */
export function localeHome(locale: Locale): string {
  return locale === "en" ? "/en/" : "/zh-HK/";
}

export function localeProduct(locale: Locale): string {
  return `${localeHome(locale)}product/`;
}

export const copy = {
  "zh-HK": {
    htmlLang: "zh-HK",
    title: "Gopur",
    description: "發掘香港的義工、課程與社區活動。",
    navHome: "首頁",
    navProduct: "產品",
    switchLabel: "English",
    switchHref: "/en/",
    openApp: "開啟應用程式",
    androidSoon: "Play / APK 稍後推出",
    headline: "發掘香港的義工、課程與社區活動",
    lede: "Gopur 幫你找到附近的活動，收藏、分享、與朋友聊天。",
    pitchKicker: "產品",
    pitchTitle: "一個城市，所有活動",
    pitchBody: "義工、課堂、社區聚會——用一個應用程式瀏覽、收藏與分享。網頁版現已開放。",
    ctaTitle: "而家就去 Gopur",
    ctaBody: "開啟 go.pur.run。Android 安裝包即將推出。",
    footer: "Gopur · 香港",
  },
  en: {
    htmlLang: "en",
    title: "Gopur",
    description: "Discover volunteering, classes and community events in Hong Kong.",
    navHome: "Home",
    navProduct: "Product",
    switchLabel: "繁體中文",
    switchHref: "/zh-HK/",
    openApp: "Open the app",
    androidSoon: "Play / APK coming later",
    headline: "Discover volunteering, classes and community events in Hong Kong",
    lede: "Find nearby events, save them, share, and chat with friends.",
    pitchKicker: "Product",
    pitchTitle: "One city. Every event.",
    pitchBody:
      "Volunteering, classes, community meetups — browse, save, and share in one app. The web app is live.",
    ctaTitle: "Go to Gopur",
    ctaBody: "Open go.pur.run. An Android package is coming soon.",
    footer: "Gopur · Hong Kong",
  },
} as const;
