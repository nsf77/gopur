import { hasContent, marshal, mergeWrite, unmarshal, type LocaleMap } from "./i18n";
import {
  normalizeAge,
  normalizeCapacity,
  normalizeCoords,
  normalizeDistrict,
  normalizeJoinMode,
  validType,
  validateSchedule,
} from "./event-rules";

export type Recurrence = {
  frequency: string;
  interval?: number;
  until?: string;
  count?: number;
  by_day?: string[];
};

function normalizeCover(raw: string): { value: string } | { error: string } {
  const cover = raw.trim();
  if (!cover) return { value: "" };
  if (cover.length > 2000) return { error: "invalid cover_image_url" };
  try {
    const u = new URL(cover);
    if (!u.host || (u.protocol !== "http:" && u.protocol !== "https:")) return { error: "invalid cover_image_url" };
  } catch {
    return { error: "invalid cover_image_url" };
  }
  return { value: cover };
}

function normalizePriceNote(note: LocaleMap): string | null {
  for (const v of Object.values(note)) {
    if ([...v].length > 300) return "price note is too long";
  }
  return null;
}

function asMap(v: unknown): LocaleMap {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: LocaleMap = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string") out[k] = val;
  }
  return out;
}

export function normalizeRecurrence(rec: Recurrence | null | undefined): { json: string | null } | { error: string } {
  if (!rec) return { json: null };
  const frequency = rec.frequency.trim().toLowerCase();
  if (!frequency || frequency === "none") return { json: null };
  if (frequency !== "daily" && frequency !== "weekly" && frequency !== "monthly") return { error: "invalid recurrence" };
  let interval = rec.interval ?? 0;
  if (interval === 0) interval = 1;
  if (interval < 1 || interval > 52) return { error: "invalid recurrence" };
  const until = (rec.until ?? "").trim();
  if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) return { error: "invalid recurrence" };
  if (rec.count != null && (rec.count < 1 || rec.count > 52)) return { error: "invalid recurrence" };
  const days = rec.by_day ?? [];
  const byDay: string[] = [];
  if (days.length) {
    if (frequency !== "weekly") return { error: "invalid recurrence" };
    const allowed = new Set(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]);
    const seen = new Set<string>();
    for (const d of days) {
      const day = d.trim().toUpperCase();
      if (!allowed.has(day)) return { error: "invalid recurrence" };
      if (!seen.has(day)) {
        seen.add(day);
        byDay.push(day);
      }
    }
  }
  const out: Record<string, unknown> = { frequency };
  if (interval) out.interval = interval;
  if (until) out.until = until;
  if (rec.count != null) out.count = rec.count;
  if (byDay.length) out.by_day = byDay;
  return { json: JSON.stringify(out) };
}

export type NewEvent = {
  id: string;
  title_i18n: string;
  description_i18n: string;
  location_i18n: string;
  start_at: string;
  end_at: string;
  event_type: string;
  price_cents: number | null;
  external_url: string | null;
  latitude: number | null;
  longitude: number | null;
  district: string;
  age_min: number | null;
  age_max: number | null;
  age_mode: string;
  capacity: number | null;
  recurrence: string | null;
  price_note_i18n: string;
  cover_image_url: string;
  join_mode: string;
  host_user_id: string;
};

export function normalizeCreate(req: Record<string, unknown>, host: string): NewEvent | { error: string } {
  let title = asMap(req.title_i18n);
  if (!hasContent(title) && typeof req.title === "string" && req.title) {
    title = mergeWrite({}, {}, req.title, String(req.locale ?? ""));
  }
  if (!hasContent(title)) return { error: "title or title_i18n is required" };
  let description = asMap(req.description_i18n);
  if (!Object.keys(description).length && typeof req.description === "string" && req.description) {
    description = mergeWrite({}, {}, req.description, String(req.locale ?? ""));
  }
  let location = asMap(req.location_i18n);
  if (!Object.keys(location).length && typeof req.location === "string" && req.location) {
    location = mergeWrite({}, {}, req.location, String(req.locale ?? ""));
  }
  const startAt = String(req.start_at ?? "");
  const endAt = String(req.end_at ?? "");
  const eventType = String(req.type ?? "");
  if (!startAt || !endAt || !eventType) return { error: "start_at, end_at, and type are required" };
  if (!validType(eventType)) return { error: "invalid event type" };
  const sched = validateSchedule(startAt, endAt);
  if (sched) return { error: sched };
  const coords = normalizeCoords(
    req.latitude == null ? null : Number(req.latitude),
    req.longitude == null ? null : Number(req.longitude),
  );
  if ("error" in coords) return coords;
  const age = normalizeAge(
    req.age_min == null ? null : Number(req.age_min),
    req.age_max == null ? null : Number(req.age_max),
    String(req.age_mode ?? ""),
  );
  if ("error" in age) return age;
  const cap = normalizeCapacity(req.capacity == null ? null : Number(req.capacity));
  if ("error" in cap) return cap;
  const district = normalizeDistrict(String(req.district ?? ""));
  if ("error" in district) return district;
  const cover = normalizeCover(String(req.cover_image_url ?? ""));
  if ("error" in cover) return cover;
  const join = normalizeJoinMode(String(req.join_mode ?? ""));
  if ("error" in join) return join;
  let priceNote = asMap(req.price_note_i18n);
  if (!Object.keys(priceNote).length && typeof req.price_note === "string" && req.price_note) {
    priceNote = mergeWrite({}, {}, req.price_note, String(req.locale ?? ""));
  }
  const pn = normalizePriceNote(priceNote);
  if (pn) return { error: pn };
  const rec = normalizeRecurrence(req.recurrence as Recurrence | undefined);
  if ("error" in rec) return rec;
  return {
    id: crypto.randomUUID(),
    title_i18n: marshal(title),
    description_i18n: marshal(description),
    location_i18n: marshal(location),
    start_at: startAt,
    end_at: endAt,
    event_type: eventType,
    price_cents: req.price_cents == null ? null : Number(req.price_cents),
    external_url: req.external_url == null ? null : String(req.external_url),
    latitude: coords.value ? coords.value[0] : null,
    longitude: coords.value ? coords.value[1] : null,
    district: district.value,
    age_min: age.min,
    age_max: age.max,
    age_mode: age.mode,
    capacity: cap.value,
    recurrence: rec.json,
    price_note_i18n: marshal(priceNote),
    cover_image_url: cover.value,
    join_mode: join.value,
    host_user_id: host,
  };
}

export function buildPatch(event: Record<string, unknown>, req: Record<string, unknown>): NewEvent | { error: string } {
  let title = unmarshal(String(event.title_i18n ?? "")) ?? {};
  let description = unmarshal(String(event.description_i18n ?? "")) ?? {};
  let location = unmarshal(String(event.location_i18n ?? "")) ?? {};
  let priceNote = unmarshal(String(event.price_note_i18n ?? "")) ?? {};
  title = mergeWrite(title, asMap(req.title_i18n), typeof req.title === "string" ? req.title : "", String(req.locale ?? ""));
  description = mergeWrite(
    description,
    asMap(req.description_i18n),
    typeof req.description === "string" ? req.description : "",
    String(req.locale ?? ""),
  );
  location = mergeWrite(
    location,
    asMap(req.location_i18n),
    typeof req.location === "string" ? req.location : "",
    String(req.locale ?? ""),
  );
  if (req.price_note != null || Object.keys(asMap(req.price_note_i18n)).length) {
    priceNote = mergeWrite(
      priceNote,
      asMap(req.price_note_i18n),
      typeof req.price_note === "string" ? req.price_note : "",
      String(req.locale ?? ""),
    );
  }
  if (!hasContent(title)) return { error: "title_i18n must contain at least one translation" };
  const pn = normalizePriceNote(priceNote);
  if (pn) return { error: pn };
  let startAt = String(event.start_at);
  if (req.start_at != null) startAt = String(req.start_at);
  let endAt = String(event.end_at);
  if (req.end_at != null) endAt = String(req.end_at);
  const sched = validateSchedule(startAt, endAt);
  if (sched) return { error: sched };
  let eventType = String(event.type);
  if (req.type != null) {
    if (!validType(String(req.type))) return { error: "invalid event type" };
    eventType = String(req.type);
  }
  let lat = event.latitude == null ? null : Number(event.latitude);
  let lng = event.longitude == null ? null : Number(event.longitude);
  if (req.latitude !== undefined || req.longitude !== undefined) {
    const coords = normalizeCoords(
      req.latitude == null ? null : Number(req.latitude),
      req.longitude == null ? null : Number(req.longitude),
    );
    if ("error" in coords) return coords;
    if (coords.value) {
      lat = coords.value[0];
      lng = coords.value[1];
    } else {
      lat = null;
      lng = null;
    }
  }
  let ageMin = event.age_min == null ? null : Number(event.age_min);
  let ageMax = event.age_max == null ? null : Number(event.age_max);
  let ageMode = String(event.age_mode ?? "suggested");
  if (req.age_min !== undefined) ageMin = req.age_min == null ? null : Number(req.age_min);
  if (req.age_max !== undefined) ageMax = req.age_max == null ? null : Number(req.age_max);
  if (req.age_mode !== undefined) ageMode = String(req.age_mode);
  if (req.age_min !== undefined || req.age_max !== undefined || req.age_mode !== undefined) {
    const age = normalizeAge(ageMin, ageMax, ageMode);
    if ("error" in age) return age;
    ageMin = age.min;
    ageMax = age.max;
    ageMode = age.mode;
  }
  let capacity = event.capacity == null ? null : Number(event.capacity);
  if (req.capacity !== undefined) {
    const cap = normalizeCapacity(req.capacity == null ? null : Number(req.capacity));
    if ("error" in cap) return cap;
    capacity = cap.value;
  }
  let district = String(event.district ?? "");
  if (req.district !== undefined) {
    const d = normalizeDistrict(String(req.district ?? ""));
    if ("error" in d) return d;
    district = d.value;
  }
  let cover = String(event.cover_image_url ?? "");
  if (req.cover_image_url !== undefined) {
    const c = normalizeCover(String(req.cover_image_url ?? ""));
    if ("error" in c) return c;
    cover = c.value;
  }
  let joinMode = String(event.join_mode ?? "approval");
  if (req.join_mode !== undefined) {
    const j = normalizeJoinMode(String(req.join_mode ?? ""));
    if ("error" in j) return j;
    joinMode = j.value;
  }
  let recurrence = event.recurrence == null ? null : String(event.recurrence);
  if (req.recurrence !== undefined) {
    const rec = normalizeRecurrence(req.recurrence as Recurrence);
    if ("error" in rec) return rec;
    recurrence = rec.json;
  }
  let priceCents = event.price_cents == null ? null : Number(event.price_cents);
  if (req.price_cents !== undefined) priceCents = req.price_cents == null ? null : Number(req.price_cents);
  let externalUrl = event.external_url == null ? null : String(event.external_url);
  if (req.external_url !== undefined) externalUrl = req.external_url == null ? null : String(req.external_url);
  return {
    id: String(event.id),
    title_i18n: marshal(title),
    description_i18n: marshal(description),
    location_i18n: marshal(location),
    start_at: startAt,
    end_at: endAt,
    event_type: eventType,
    price_cents: priceCents,
    external_url: externalUrl,
    latitude: lat,
    longitude: lng,
    district,
    age_min: ageMin,
    age_max: ageMax,
    age_mode: ageMode,
    capacity,
    recurrence,
    price_note_i18n: marshal(priceNote),
    cover_image_url: cover,
    join_mode: joinMode,
    host_user_id: String(event.host_user_id ?? ""),
  };
}
