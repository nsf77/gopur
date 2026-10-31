import * as v from "valibot";
import { G } from "./belt";
import type { Event } from "./schemas";

const HONG_KONG_OFFSET_MS = 8 * 60 * 60 * 1000;

export const DISTRICTS = [
  "central-western",
  "wan-chai",
  "eastern",
  "southern",
  "yau-tsim-mong",
  "sham-shui-po",
  "kowloon-city",
  "wong-tai-sin",
  "kwun-tong",
  "kwai-tsing",
  "tsuen-wan",
  "tuen-mun",
  "yuen-long",
  "north",
  "tai-po",
  "sha-tin",
  "sai-kung",
  "islands",
] as const;

export type EventDraft = {
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  locationEn: string;
  locationZh: string;
  startsAt: string;
  endsAt: string;
  type: "volunteer" | "community" | "class" | "official";
  district: string;
  latitude: string;
  longitude: string;
  ageMin: string;
  ageMax: string;
  ageMode: "strict" | "suggested";
  capacity: string;
  recurrence: string;
  priceHkd: string;
  priceNote: string;
  coverImageUrl: string;
  joinMode: "instant" | "approval";
};

export const EMPTY_EVENT_DRAFT: EventDraft = {
  titleEn: "",
  titleZh: "",
  descriptionEn: "",
  descriptionZh: "",
  locationEn: "",
  locationZh: "",
  startsAt: "",
  endsAt: "",
  type: "community",
  district: "",
  latitude: "",
  longitude: "",
  ageMin: "",
  ageMax: "",
  ageMode: "suggested",
  capacity: "",
  recurrence: "",
  priceHkd: "",
  priceNote: "",
  coverImageUrl: "",
  joinMode: "instant",
};

export type EventDraftError = "title" | "when" | "order" | "pin" | "age" | "capacity" | "price" | "cover";

export type EventWriteBody = {
  title_i18n?: Record<string, string>;
  description_i18n?: Record<string, string>;
  location_i18n?: Record<string, string>;
  start_at: string;
  end_at: string;
  type: EventDraft["type"];
  district?: string;
  latitude?: number | null;
  longitude?: number | null;
  age_min?: number | null;
  age_max?: number | null;
  age_mode: EventDraft["ageMode"];
  capacity: number | null;
  recurrence?: { frequency: string } | null;
  price_cents: number | null;
  price_note?: string;
  price_note_i18n?: Record<string, string>;
  cover_image_url?: string;
  join_mode: EventDraft["joinMode"];
};

export function parseHongKongDateTime(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (hour > 23 || minute > 59) return null;
  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute) - HONG_KONG_OFFSET_MS);
  const hongKong = new Date(utc.getTime() + HONG_KONG_OFFSET_MS);
  if (
    hongKong.getUTCFullYear() !== year ||
    hongKong.getUTCMonth() !== month - 1 ||
    hongKong.getUTCDate() !== day ||
    hongKong.getUTCHours() !== hour ||
    hongKong.getUTCMinutes() !== minute
  ) {
    return null;
  }
  return utc.toISOString();
}

export function formatHongKongDateTimeInput(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const hongKong = new Date(time + HONG_KONG_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${hongKong.getUTCFullYear()}-${pad(hongKong.getUTCMonth() + 1)}-${pad(hongKong.getUTCDate())} ${pad(hongKong.getUTCHours())}:${pad(hongKong.getUTCMinutes())}`;
}

export function toInputTime(value: string): string {
  return value.trim().replace(" ", "T");
}

export function fromInputTime(value: string): string {
  return value.trim().replace("T", " ");
}

function hkdToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

function centsToHkdInput(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return "";
  const hkd = cents / 100;
  return Number.isInteger(hkd) ? String(hkd) : hkd.toFixed(2);
}

function optionalWholeNumber(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return "invalid";
  return Number(trimmed);
}

function coordinate(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return "invalid";
  return Number(trimmed);
}

function i18nMap(en: string, zh: string): Record<string, string> | undefined {
  const map: Record<string, string> = {};
  if (en.trim()) map.en = en.trim();
  if (zh.trim()) map["zh-Hant"] = zh.trim();
  return Object.keys(map).length > 0 ? map : undefined;
}

function recurrenceLabel(recurrence: unknown): string {
  if (!recurrence) return "";
  if (G.isString(recurrence)) return recurrence === "none" ? "" : recurrence;
  if (G.isObject(recurrence) && !G.isArray(recurrence)) {
    const frequency = (recurrence as { frequency?: unknown }).frequency;
    if (G.isString(frequency) && frequency !== "none") return frequency;
  }
  return "";
}

function eventType(value: string): EventDraft["type"] {
  if (value === "volunteer" || value === "class" || value === "official") return value;
  return "community";
}

const EventDraftFields = v.object({
  titleEn: v.string(),
  titleZh: v.string(),
  descriptionEn: v.string(),
  descriptionZh: v.string(),
  locationEn: v.string(),
  locationZh: v.string(),
  startsAt: v.string(),
  endsAt: v.string(),
  type: v.picklist(["volunteer", "community", "class", "official"]),
  district: v.string(),
  latitude: v.string(),
  longitude: v.string(),
  ageMin: v.string(),
  ageMax: v.string(),
  ageMode: v.picklist(["strict", "suggested"]),
  capacity: v.string(),
  recurrence: v.string(),
  priceHkd: v.string(),
  priceNote: v.string(),
  coverImageUrl: v.string(),
  joinMode: v.picklist(["instant", "approval"]),
});

export const EventDraftSchema = v.pipe(
  EventDraftFields,
  v.check((draft) => Boolean(draft.titleEn.trim() || draft.titleZh.trim()), "title"),
  v.check((draft) => Boolean(parseHongKongDateTime(draft.startsAt) && parseHongKongDateTime(draft.endsAt)), "when"),
  v.check((draft) => {
    const start = parseHongKongDateTime(draft.startsAt);
    const end = parseHongKongDateTime(draft.endsAt);
    return Boolean(start && end && Date.parse(end) > Date.parse(start));
  }, "order"),
  v.check((draft) => {
    const latitude = coordinate(draft.latitude);
    const longitude = coordinate(draft.longitude);
    if (latitude === "invalid" || longitude === "invalid") return false;
    if ((latitude == null) !== (longitude == null)) return false;
    if (typeof latitude === "number" && (latitude < -90 || latitude > 90)) return false;
    if (typeof longitude === "number" && (longitude < -180 || longitude > 180)) return false;
    return true;
  }, "pin"),
  v.check((draft) => {
    const ageMin = optionalWholeNumber(draft.ageMin);
    const ageMax = optionalWholeNumber(draft.ageMax);
    if (ageMin === "invalid" || ageMax === "invalid") return false;
    if (typeof ageMin === "number" && ageMin > 120) return false;
    if (typeof ageMax === "number" && ageMax > 120) return false;
    if (typeof ageMin === "number" && typeof ageMax === "number" && ageMin > ageMax) return false;
    return true;
  }, "age"),
  v.check((draft) => {
    const capacity = optionalWholeNumber(draft.capacity);
    return capacity !== "invalid" && capacity !== 0;
  }, "capacity"),
  v.check((draft) => hkdToCents(draft.priceHkd) != null, "price"),
  v.check((draft) => {
    const cover = draft.coverImageUrl.trim();
    return !cover || /^https?:\/\/\S+$/.test(cover);
  }, "cover"),
);

export function parseEventDraft(data: unknown): { ok: true; value: EventDraft } | { ok: false; error: EventDraftError } {
  const result = v.safeParse(EventDraftSchema, data);
  if (result.success) return { ok: true, value: result.output };
  const message = result.issues[0]?.message;
  if (
    message === "title" ||
    message === "when" ||
    message === "order" ||
    message === "pin" ||
    message === "age" ||
    message === "capacity" ||
    message === "price" ||
    message === "cover"
  ) {
    return { ok: false, error: message };
  }
  return { ok: false, error: "title" };
}

function recurrenceFromDraft(value: string): { frequency: string } | undefined {
  const frequency = value.trim().toLowerCase();
  if (frequency === "daily" || frequency === "weekly" || frequency === "monthly") return { frequency };
  if (frequency === "none") return { frequency: "none" };
  return undefined;
}

export function draftToEventBody(draft: EventDraft): EventWriteBody {
  const latitude = coordinate(draft.latitude);
  const longitude = coordinate(draft.longitude);
  const ageMin = optionalWholeNumber(draft.ageMin);
  const ageMax = optionalWholeNumber(draft.ageMax);
  const capacity = optionalWholeNumber(draft.capacity);
  const priceNote = draft.priceNote.trim();
  const district = draft.district.trim();
  const cover = draft.coverImageUrl.trim();
  return {
    title_i18n: i18nMap(draft.titleEn, draft.titleZh),
    description_i18n: i18nMap(draft.descriptionEn, draft.descriptionZh),
    location_i18n: i18nMap(draft.locationEn, draft.locationZh),
    start_at: parseHongKongDateTime(draft.startsAt) ?? "",
    end_at: parseHongKongDateTime(draft.endsAt) ?? "",
    type: draft.type,
    district: district || undefined,
    latitude: typeof latitude === "number" ? latitude : undefined,
    longitude: typeof longitude === "number" ? longitude : undefined,
    age_min: typeof ageMin === "number" ? ageMin : undefined,
    age_max: typeof ageMax === "number" ? ageMax : undefined,
    age_mode: draft.ageMode,
    capacity: typeof capacity === "number" ? capacity : null,
    recurrence: recurrenceFromDraft(draft.recurrence),
    price_cents: hkdToCents(draft.priceHkd) ?? 0,
    price_note: priceNote,
    price_note_i18n: priceNote ? { en: priceNote, "zh-Hant": priceNote } : undefined,
    cover_image_url: cover || undefined,
    join_mode: draft.joinMode,
  };
}

export function draftFromEvent(event: Event): EventDraft {
  return {
    titleEn: event.title_i18n.en ?? "",
    titleZh: event.title_i18n["zh-Hant"] ?? "",
    descriptionEn: event.description_i18n.en ?? "",
    descriptionZh: event.description_i18n["zh-Hant"] ?? "",
    locationEn: event.location_i18n.en ?? "",
    locationZh: event.location_i18n["zh-Hant"] ?? "",
    startsAt: formatHongKongDateTimeInput(event.start_at),
    endsAt: formatHongKongDateTimeInput(event.end_at),
    type: eventType(event.type),
    district: event.district ?? "",
    latitude: event.latitude == null ? "" : String(event.latitude),
    longitude: event.longitude == null ? "" : String(event.longitude),
    ageMin: event.age_min == null ? "" : String(event.age_min),
    ageMax: event.age_max == null ? "" : String(event.age_max),
    ageMode: event.age_mode === "strict" ? "strict" : "suggested",
    capacity: event.capacity == null ? "" : String(event.capacity),
    recurrence: recurrenceLabel(event.recurrence),
    priceHkd: centsToHkdInput(event.price_cents),
    priceNote: event.price_note ?? "",
    coverImageUrl: event.cover_image_url ?? "",
    joinMode: event.join_mode === "approval" ? "approval" : "instant",
  };
}

export type LockedField = "capacity" | "age" | "pin";

function fieldWasSet(draft: EventDraft, field: LockedField): boolean {
  if (field === "capacity") return draft.capacity.trim().length > 0;
  if (field === "age") return draft.ageMin.trim().length > 0 || draft.ageMax.trim().length > 0;
  return draft.latitude.trim().length > 0 || draft.longitude.trim().length > 0;
}

export function clearedLockedFields(before: EventDraft, after: EventDraft): LockedField[] {
  const fields: LockedField[] = ["capacity", "age", "pin"];
  return fields.filter((field) => fieldWasSet(before, field) && !fieldWasSet(after, field));
}
