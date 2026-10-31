import { G, O } from "./belt";
import type { Event } from "./schemas";

const MISSING_ZH_TITLE = "(沒有中文註冊名稱)";

export type TextField = "title" | "description" | "location" | "district" | "price_note";

function localeKey(locale: string): "en" | "zh-Hant" {
  return locale === "en" || locale.startsWith("en") ? "en" : "zh-Hant";
}

function isMissing(value: string | null | undefined): boolean {
  const trimmed = (value ?? "").trim();
  return trimmed.length === 0 || trimmed.startsWith(MISSING_ZH_TITLE);
}

function fieldMap(event: Event, field: TextField): Record<string, string> | undefined {
  switch (field) {
    case "title":
      return event.title_i18n;
    case "description":
      return event.description_i18n;
    case "location":
      return event.location_i18n;
    case "district":
      return event.district_i18n;
    case "price_note":
      return event.price_note_i18n;
  }
}

function legacy(event: Event, field: TextField): string {
  if (field === "district") return event.district?.trim() ?? "";
  if (field === "price_note") return event.price_note?.trim() ?? "";
  return event[field].trim();
}

export function eventText(event: Event, field: TextField, locale: string): string {
  const map = fieldMap(event, field);
  const preferred = localeKey(locale);
  const alternate = preferred === "en" ? "zh-Hant" : "en";
  const first = map?.[preferred];
  if (!isMissing(first) && G.isString(first)) return first.trim();
  const second = map?.[alternate];
  if (!isMissing(second) && G.isString(second)) return second.trim();
  return legacy(event, field);
}

export function eventImageUrls(event: Event): string[] {
  return O.mapWithDefault(O.fromNullable(event.cover_image_url), [] as string[], (value) =>
    value.trim() ? [value] : [],
  );
}

export function formatEventWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-HK" : "zh-HK", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatHkdDollars(cents: number): string {
  const amount = cents / 100;
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/\.?0+$/, "");
}

export function formatCompactCount(n: number, loc: string): string {
  if (n <= 0) return "";
  if (loc !== "en" && n >= 10_000) {
    const text = (n / 10_000).toFixed(1);
    return `${text.endsWith(".0") ? text.slice(0, -2) : text}萬`;
  }
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const text = (n / 1000).toFixed(1);
    return `${text.endsWith(".0") ? text.slice(0, -2) : text}K`;
  }
  const text = (n / 1_000_000).toFixed(1);
  return `${text.endsWith(".0") ? text.slice(0, -2) : text}M`;
}
