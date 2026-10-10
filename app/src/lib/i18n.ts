import { G, O, pipe } from "./belt";

export type AppLocale = "zh-Hant" | "en";

const KEY = "gopur.locale";

const catalogs: Record<AppLocale, Record<string, unknown>> = {
  en: {
    site: { documentTitle: "{{title}} · Gopur" },
    common: {
      retry: "Retry",
      back: "Back",
      comingSoon: "Coming soon",
      loading: "Loading…",
      error: "Something went wrong",
      loadMore: "Load more",
      signIn: "Sign in",
      done: "Done",
    },
    tabs: { home: "Home", explore: "Explore", chat: "Chat", myEvents: "My events", profile: "Profile" },
    shell: { sideNav: "Side navigation", otherFeeds: "Other feeds" },
    errors: { offline: "Can't connect. Check your connection and retry." },
    home: { title: "Home", empty: "No events to show yet", error: "Could not load events" },
    auth: {
      welcome: "Welcome to Gopur",
      subtitle: "Discover volunteering, classes and community events in Hong Kong",
      emailLabel: "Email address",
      emailPlaceholder: "you@example.com",
      invalidEmail: "Enter a valid email address.",
      invalidCode: "Incorrect or expired verification code.",
      sendCode: "Send code",
      verifyTitle: "Enter verification code",
      verifySubtitle: "We sent a 6-digit code to {{email}}",
      codeLabel: "Verification code",
      verifyButton: "Verify and sign in",
      resendCode: "Resend code",
      resendIn: "Resend in {{seconds}}s",
      changeEmail: "Use a different email",
      signInRequired: "Please sign in first.",
    },
    event: {
      dateTbc: "Date to be confirmed",
      priceUnannounced: "Price not announced",
      free: "Free",
      priceSingle: "${{amount}}",
      priceFrom: "From ${{amount}}",
      spots: "{{total}} going",
      notFound: "Event not found",
      description: "About",
      organizer: "Organizer",
      date: "Date & time",
      source: "Source",
      viewSource: "View on source",
    },
    viewer: {
      saved: "Saved",
      liked: "Liked",
      share: "Share",
      linkCopied: "Link copied",
      save: "Save",
      like: "Like",
      likers: "Liked by",
    },
    profile: {
      unknownUser: "Unknown user",
      title: "Profile",
      signInTitle: "Sign in to Gopur",
      signInBody:
        "Browse the home feed without signing in. Sign in to save events, like them, and edit your profile.",
      signOut: "Sign out",
      signOutConfirm: "Sign out of Gopur on this device?",
      email: "Email",
      viewPublic: "View public profile",
      notFound: "Account not found.",
    },
    profileEdit: {
      edit: "Edit profile",
      displayName: "Display name",
      username: "Username",
      bio: "Bio",
      private: "Private account",
      save: "Save",
      saved: "Profile saved.",
    },
    settings: {
      title: "Settings",
      language: "Language",
      languageHint: "The app reloads after changing.",
      account: "Account",
      editProfile: "Edit profile",
      signOut: "Sign out",
      appearance: { title: "Appearance", system: "System", light: "Light", dark: "Dark" },
    },
    explore: {
      searchPlaceholder: "Search events",
      tooShort: "Type at least 2 letters",
      filters: "Filters",
      apply: "Show results",
      reset: "Reset",
      weekend: "This weekend",
    },
    discover: {
      events: "Events",
      people: "People",
      empty: "No events found",
      organisers: "Organisers",
      upcomingCount: "{{count}} events",
      peopleOrOrganisersEmpty: "No people or organisers found",
    },
    stub: {
      chat: "Chat is not in this build.",
      myEvents: "Saved and hosted lists need later API routes.",
      notifications: "Notifications are not wired yet.",
      editor: "Host editor is stubbed for this stage.",
    },
  },
  "zh-Hant": {
    site: { documentTitle: "{{title}} · Gopur" },
    common: {
      retry: "重試",
      back: "返回",
      comingSoon: "即將推出",
      loading: "載入中…",
      error: "發生錯誤",
      loadMore: "載入更多",
      signIn: "登入",
      done: "完成",
    },
    tabs: { home: "主頁", explore: "探索", chat: "聊天", myEvents: "我的活動", profile: "個人" },
    shell: { sideNav: "側邊導覽", otherFeeds: "其他動態" },
    errors: { offline: "無法連線，請檢查網絡後重試。" },
    home: { title: "主頁", empty: "暫時沒有活動", error: "無法載入活動" },
    auth: {
      welcome: "歡迎使用 Gopur",
      subtitle: "探索香港義工、課程及社區活動",
      emailLabel: "電郵地址",
      emailPlaceholder: "you@example.com",
      invalidEmail: "請輸入有效的電郵地址。",
      invalidCode: "驗證碼不正確或已過期。",
      sendCode: "發送驗證碼",
      verifyTitle: "輸入驗證碼",
      verifySubtitle: "我們已發送 6 位數驗證碼至 {{email}}",
      codeLabel: "驗證碼",
      verifyButton: "驗證並登入",
      resendCode: "重新發送",
      resendIn: "{{seconds}} 秒後可重新發送",
      changeEmail: "使用其他電郵",
      signInRequired: "請先登入。",
    },
    event: {
      dateTbc: "日期不定",
      priceUnannounced: "價錢未公布",
      free: "免費",
      priceSingle: "${{amount}}",
      priceFrom: "${{amount}} 起",
      spots: "{{total}} 人參加",
      notFound: "找不到此活動",
      description: "簡介",
      organizer: "主辦機構",
      date: "日期及時間",
      source: "資料來源",
      viewSource: "前往來源",
    },
    viewer: {
      saved: "已收藏",
      liked: "已喜歡",
      share: "分享",
      linkCopied: "已複製連結",
      save: "收藏",
      like: "喜歡",
      likers: "讚好的人",
    },
    profile: {
      unknownUser: "未知用戶",
      title: "個人檔案",
      signInTitle: "登入 Gopur",
      signInBody: "未登入也可瀏覽主頁。登入後可收藏活動、按讚和編輯個人檔案。",
      signOut: "登出",
      signOutConfirm: "要在此裝置登出 Gopur？",
      email: "電郵",
      viewPublic: "查看公開檔案",
      notFound: "找不到此帳戶。",
    },
    profileEdit: {
      edit: "編輯個人資料",
      displayName: "顯示名稱",
      username: "用戶名稱",
      bio: "簡介",
      private: "私人帳戶",
      save: "儲存",
      saved: "已儲存個人資料。",
    },
    settings: {
      title: "設定",
      language: "語言",
      languageHint: "更改後會重新載入。",
      account: "帳戶",
      editProfile: "編輯個人資料",
      signOut: "登出",
      appearance: { title: "外觀", system: "跟隨系統", light: "淺色", dark: "深色" },
    },
    explore: {
      searchPlaceholder: "搜尋活動",
      tooShort: "請輸入至少 2 個字母",
      filters: "篩選",
      apply: "顯示結果",
      reset: "重設",
      weekend: "今個週末",
    },
    discover: {
      events: "活動",
      people: "人物",
      empty: "找不到活動",
      organisers: "主辦機構",
      upcomingCount: "{{count}} 個活動",
      peopleOrOrganisersEmpty: "找不到用戶或主辦機構",
    },
    stub: {
      chat: "聊天尚未在此版本提供。",
      myEvents: "收藏與主辦清單需要後續 API。",
      notifications: "通知尚未接上。",
      editor: "主辦編輯器此階段為佔位頁。",
    },
  },
};

let currentLocale: AppLocale = "zh-Hant";

function readLocale(): AppLocale {
  const stored = localStorage.getItem(KEY);
  return stored === "en" || stored === "zh-Hant" ? stored : "zh-Hant";
}

export function locale(): AppLocale {
  return currentLocale;
}

export function setLocale(next: AppLocale): void {
  currentLocale = next;
  localStorage.setItem(KEY, next);
  document.documentElement.lang = next;
}

export function initLocale(): void {
  currentLocale = readLocale();
  document.documentElement.lang = currentLocale;
}

function lookup(table: Record<string, unknown>, key: string): O.Option<string> {
  const parts = key.split(".");
  let node: unknown = table;
  for (const part of parts) {
    if (!G.isObject(node)) return O.None;
    node = (node as Record<string, unknown>)[part];
  }
  return G.isString(node) ? O.Some(node) : O.None;
}

export function t(key: string, vars?: Record<string, string | number>, loc?: AppLocale): string {
  const table = catalogs[loc ?? locale()];
  const resolved = O.isSome(lookup(table, key)) ? lookup(table, key) : lookup(catalogs.en, key);
  return pipe(
    resolved,
    O.map((text) =>
      vars
        ? text.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
            G.isNotNullable(vars[name]) ? String(vars[name]) : "",
          )
        : text,
    ),
    O.getWithDefault(key),
  );
}

export function documentTitle(title: string): string {
  return t("site.documentTitle", { title });
}
