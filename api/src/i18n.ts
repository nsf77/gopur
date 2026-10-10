export const LOCALE_EN = "en";
export const LOCALE_ZH = "zh-Hant";
export const DEFAULT_LOCALE = LOCALE_ZH;
export const UNREGISTERED_ZH = "(沒有中文註冊名稱)";

export type LocaleMap = Record<string, string>;

export function present(value: string | undefined | null): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  return !v.startsWith(UNREGISTERED_ZH);
}

export function hasContent(map: LocaleMap): boolean {
  return Object.values(map).some((v) => present(v));
}

export function marshal(map: LocaleMap): string {
  const ordered: LocaleMap = {};
  for (const k of Object.keys(map).sort()) {
    const val = map[k];
    if (val != null) ordered[k] = val;
  }
  return JSON.stringify(ordered).replace(/[<>&]/g, (ch) => {
    if (ch === "<") return "\\u003c";
    if (ch === ">") return "\\u003e";
    return "\\u0026";
  });
}

export function mergeWrite(existing: LocaleMap, patch: LocaleMap, convenience: string, locale: string): LocaleMap {
  const result = { ...existing };
  for (const [key, value] of Object.entries(patch)) {
    if (!value) {
      delete result[key];
      continue;
    }
    result[normalizeLocale(key)] = value;
  }
  if (convenience) {
    result[normalizeLocale(locale) || LOCALE_EN] = convenience;
  }
  return result;
}

export function unmarshal(raw: string | null | undefined): LocaleMap | null {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const out: LocaleMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

export function normalizeLocale(raw: string): string {
  const v = raw.trim().toLowerCase().replaceAll("_", "-");
  if (v === "en" || v.startsWith("en-")) return LOCALE_EN;
  if (v === "zh" || v.startsWith("zh-")) return LOCALE_ZH;
  return DEFAULT_LOCALE;
}

export function resolve(m: LocaleMap, locale: string): string {
  if (!m || Object.keys(m).length === 0) return "";
  const norm = normalizeLocale(locale);
  const preferred = m[norm];
  if (present(preferred)) return preferred ?? "";
  const other = norm === LOCALE_EN ? LOCALE_ZH : LOCALE_EN;
  const fallback = m[other];
  if (present(fallback)) return fallback ?? "";
  for (const value of Object.values(m)) {
    if (present(value)) return value;
  }
  return "";
}

export function availableLocales(...maps: LocaleMap[]): string[] {
  let hasZh = false;
  let hasEn = false;
  for (const m of maps) {
    if (present(m[LOCALE_ZH])) hasZh = true;
    if (present(m[LOCALE_EN])) hasEn = true;
  }
  const out: string[] = [];
  if (hasZh) out.push(LOCALE_ZH);
  if (hasEn) out.push(LOCALE_EN);
  return out;
}

export function requestLocale(url: URL, acceptLanguage: string | null): string {
  const lang = url.searchParams.get("lang");
  if (lang) return normalizeLocale(lang);
  const locale = url.searchParams.get("locale");
  if (locale) return normalizeLocale(locale);
  if (acceptLanguage) {
    const first = acceptLanguage.split(",")[0]?.trim() ?? "";
    if (first) return normalizeLocale(first);
  }
  return DEFAULT_LOCALE;
}

const HK_DISTRICTS: Array<{ zh: string; en: string }> = [
  { zh: "中西區", en: "Central and Western" },
  { zh: "東區", en: "Eastern" },
  { zh: "南區", en: "Southern" },
  { zh: "灣仔", en: "Wan Chai" },
  { zh: "深水埗", en: "Sham Shui Po" },
  { zh: "九龍城", en: "Kowloon City" },
  { zh: "觀塘", en: "Kwun Tong" },
  { zh: "黃大仙", en: "Wong Tai Sin" },
  { zh: "油尖旺", en: "Yau Tsim Mong" },
  { zh: "離島", en: "Islands" },
  { zh: "葵青", en: "Kwai Tsing" },
  { zh: "北區", en: "North" },
  { zh: "西貢", en: "Sai Kung" },
  { zh: "沙田", en: "Sha Tin" },
  { zh: "大埔", en: "Tai Po" },
  { zh: "荃灣", en: "Tsuen Wan" },
  { zh: "屯門", en: "Tuen Mun" },
  { zh: "元朗", en: "Yuen Long" },
];

function districtKey(value: string): string {
  return value.toLowerCase().replaceAll(" ", "").replaceAll("-", "").replace(/district$/i, "").replace(/區$/, "");
}

export function districtI18n(label: string): LocaleMap {
  label = label.trim();
  if (!label) return {};
  const norm = districtKey(label);
  for (const entry of HK_DISTRICTS) {
    if (norm === districtKey(entry.zh) || norm === districtKey(entry.en)) {
      return { [LOCALE_ZH]: entry.zh, [LOCALE_EN]: entry.en };
    }
  }
  if ([...label].some(isHanChar)) return { [LOCALE_ZH]: label };
  return { [LOCALE_EN]: label };
}

function isHanChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return cp >= 0x3400 && cp <= 0x9fff;
}
