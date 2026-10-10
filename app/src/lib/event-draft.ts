import { EventWrite } from "api";
import type { Event } from "api";
import { type } from "arktype";

const HONG_KONG_OFFSET_MS = 8 * 60 * 60 * 1000;

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

export type EventDraftError = "title" | "when" | "order" | "pin" | "age" | "capacity" | "price" | "cover";

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
  return utc.toISOString();
}

export function formatHongKongDateTimeInput(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const hongKong = new Date(time + HONG_KONG_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${hongKong.getUTCFullYear()}-${pad(hongKong.getUTCMonth() + 1)}-${pad(hongKong.getUTCDate())} ${pad(hongKong.getUTCHours())}:${pad(hongKong.getUTCMinutes())}`;
}

export function hkdToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

export function centsToHkdInput(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return "";
  const hkd = cents / 100;
  return Number.isInteger(hkd) ? String(hkd) : hkd.toFixed(2);
}

export function validateEventDraft(draft: EventDraft): EventDraftError | null {
  if (!draft.titleEn.trim() && !draft.titleZh.trim()) return "title";
  const start = parseHongKongDateTime(draft.startsAt);
  const end = parseHongKongDateTime(draft.endsAt);
  if (!start || !end) return "when";
  if (Date.parse(end) <= Date.parse(start)) return "order";
  const latitude = coordinate(draft.latitude);
  const longitude = coordinate(draft.longitude);
  if (latitude === "invalid" || longitude === "invalid") return "pin";
  if ((latitude == null) !== (longitude == null)) return "pin";
  if (typeof latitude === "number" && (latitude < -90 || latitude > 90)) return "pin";
  if (typeof longitude === "number" && (longitude < -180 || longitude > 180)) return "pin";
  const ageMin = optionalWholeNumber(draft.ageMin);
  const ageMax = optionalWholeNumber(draft.ageMax);
  if (ageMin === "invalid" || ageMax === "invalid") return "age";
  if (typeof ageMin === "number" && ageMin > 120) return "age";
  if (typeof ageMax === "number" && ageMax > 120) return "age";
  if (typeof ageMin === "number" && typeof ageMax === "number" && ageMin > ageMax) return "age";
  const capacity = optionalWholeNumber(draft.capacity);
  if (capacity === "invalid" || capacity === 0) return "capacity";
  if (hkdToCents(draft.priceHkd) == null) return "price";
  const cover = draft.coverImageUrl.trim();
  if (cover && !/^https?:\/\/\S+$/.test(cover)) return "cover";
  return null;
}

export const DRAFT_ERROR_COPY: Record<EventDraftError, string> = {
  title: "Add a title in English or Chinese.",
  when: "Start and end must be valid Hong Kong date-times.",
  order: "End must be after start.",
  pin: "Latitude and longitude must both be set and valid.",
  age: "Age range is invalid.",
  capacity: "Capacity must be a whole number of at least 1.",
  price: "Price must be a HKD amount.",
  cover: "Cover image must be an http(s) URL.",
};

function i18nMap(en: string, zh: string): Record<string, string> | undefined {
  const map: Record<string, string> = {};
  if (en.trim()) map.en = en.trim();
  if (zh.trim()) map["zh-Hant"] = zh.trim();
  return Object.keys(map).length > 0 ? map : undefined;
}

export type EventWriteBody = typeof EventWrite.infer;

export function draftToEventBody(draft: EventDraft): EventWriteBody {
  const latitude = coordinate(draft.latitude);
  const longitude = coordinate(draft.longitude);
  const ageMin = optionalWholeNumber(draft.ageMin);
  const ageMax = optionalWholeNumber(draft.ageMax);
  const capacity = optionalWholeNumber(draft.capacity);
  const priceNote = draft.priceNote.trim();
  const district = draft.district.trim();
  const cover = draft.coverImageUrl.trim();
  const frequency = draft.recurrence.trim().toLowerCase();
  const body: EventWriteBody = {
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
    price_cents: hkdToCents(draft.priceHkd) ?? 0,
    price_note: priceNote,
    price_note_i18n: priceNote ? { en: priceNote, "zh-Hant": priceNote } : undefined,
    cover_image_url: cover || undefined,
    join_mode: draft.joinMode,
  };
  if (frequency === "daily" || frequency === "weekly" || frequency === "monthly") {
    body.recurrence = { frequency };
  } else if (frequency === "none") {
    body.recurrence = { frequency: "none" };
  }
  return body;
}

export function parseEventWrite(body: EventWriteBody): string | null {
  const checked = EventWrite(body);
  if (checked instanceof type.errors) return checked.summary;
  return null;
}

export function draftFromEvent(event: Event): EventDraft {
  const recurrence =
    event.recurrence && typeof event.recurrence === "object" && "frequency" in event.recurrence
      ? String((event.recurrence as { frequency?: string }).frequency ?? "")
      : typeof event.recurrence === "string"
        ? event.recurrence
        : "";
  return {
    titleEn: event.title_i18n.en ?? "",
    titleZh: event.title_i18n["zh-Hant"] ?? "",
    descriptionEn: event.description_i18n.en ?? "",
    descriptionZh: event.description_i18n["zh-Hant"] ?? "",
    locationEn: event.location_i18n.en ?? "",
    locationZh: event.location_i18n["zh-Hant"] ?? "",
    startsAt: formatHongKongDateTimeInput(event.start_at),
    endsAt: formatHongKongDateTimeInput(event.end_at),
    type: (["volunteer", "community", "class", "official"] as const).includes(event.type as EventDraft["type"])
      ? (event.type as EventDraft["type"])
      : "community",
    district: event.district ?? "",
    latitude: event.latitude == null ? "" : String(event.latitude),
    longitude: event.longitude == null ? "" : String(event.longitude),
    ageMin: event.age_min == null ? "" : String(event.age_min),
    ageMax: event.age_max == null ? "" : String(event.age_max),
    ageMode: event.age_mode === "strict" ? "strict" : "suggested",
    capacity: event.capacity == null ? "" : String(event.capacity),
    recurrence: recurrence === "none" ? "" : recurrence,
    priceHkd: centsToHkdInput(event.price_cents),
    priceNote: event.price_note ?? "",
    coverImageUrl: event.cover_image_url ?? "",
    joinMode: event.join_mode === "approval" ? "approval" : "instant",
  };
}

export function isEventHost(userId: string | null | undefined, event: Event): boolean {
  if (!userId) return false;
  return userId === event.host_user_id || userId === (event.organizer?.id ?? "");
}
