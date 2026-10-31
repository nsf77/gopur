import { districtFields, text, TYPE_OFFICIAL, type ImportEvent, type SourceMeta } from "../event";
import type { Fetcher } from "../fetch";
import { emptyEvent, type Batch, type Session } from "../types";
import { foldLabel, groupExternalID, normalizeSessions, upcoming, withinHorizon } from "../sessions";
import { cleanLink } from "../sourceurl";
import { HKT_OFFSET_MS } from "../time";
import { xmlBlocks, xmlChild } from "../xml";
import { parseCatalog, regionDistrict, resolveVenue, type Catalog } from "./lcsdvenues";

const BASE_URL = "https://fs-open-1304240968.cos.ap-hongkong.myqcloud.com/prod/gprd/URBTIX_eventBatch_{}.xml";
const VENUES_URL = "https://www.lcsd.gov.hk/datagovhk/event/venues.xml";
const LISTING_URL = "https://www.urbtix.hk/";

export function meta(): SourceMeta {
  return {
    id: "urbtix",
    username: "urbtix",
    displayName: "城市售票網 URBTIX",
    attribution:
      "資料來源：康樂及文化事務署（城市售票網）/ DATA.GOV.HK\nSource: LCSD (URBTIX), HKSAR Government, via DATA.GOV.HK",
    datasetUrl: "https://data.gov.hk/en-data/dataset/hk-lcsd-event-urbtix-event",
    listingUrl: LISTING_URL,
  };
}

function ymdHkt(d: Date): string {
  const s = new Date(d.getTime() + HKT_OFFSET_MS);
  const y = s.getUTCFullYear();
  const m = String(s.getUTCMonth() + 1).padStart(2, "0");
  const day = String(s.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function fetchBatch(fetcher: Fetcher, now: Date): Promise<Uint8Array> {
  for (let offset = 0; offset < 3; offset++) {
    const day = new Date(now.getTime() - offset * 86400_000);
    const url = BASE_URL.replace("{}", ymdHkt(day));
    try {
      return await fetcher.get(url, 2 << 20);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("404") && offset < 2) continue;
      throw e;
    }
  }
  throw new Error("urbtix batch unavailable");
}

export async function fetchUrbtix(now: () => Date, fetcher: Fetcher): Promise<Batch> {
  const data = await fetchBatch(fetcher, now());
  const venues = await fetcher.get(VENUES_URL, 20 << 20);
  return parseUrbtix(now(), data, parseCatalog(venues));
}

type Show = {
  refNo: string;
  datetime: string;
  titleEg: string;
  titleTc: string;
  remarkEg: string;
  remarkTc: string;
  url: string;
};

type UrbtixEv = {
  eventCode: string;
  eventEg: string;
  eventTc: string;
  eventUrl: string;
  mainEg: string;
  mainTc: string;
  subEg: string;
  subTc: string;
  venueCode: string;
  venueEg: string;
  venueTc: string;
  cityEg: string;
  regionEg: string;
  regionTc: string;
  shows: Show[];
};

function parseEv(inner: string): UrbtixEv {
  const cat = xmlBlocks(inner, "CATEGORY")[0]?.inner ?? "";
  const main = xmlBlocks(cat, "MAIN_CAT")[0]?.inner ?? "";
  const sub = xmlBlocks(cat, "SUB_CAT")[0]?.inner ?? "";
  const loc = xmlBlocks(inner, "LOCATION")[0]?.inner ?? "";
  const perfs = xmlBlocks(inner, "PERFORMANCES")[0]?.inner ?? inner;
  const shows: Show[] = xmlBlocks(perfs, "PERFORMANCE").map((p) => ({
    refNo: xmlChild(p.inner, "REF_NO"),
    datetime: xmlChild(p.inner, "PERFORMANCE_DATETIME"),
    titleEg: xmlChild(p.inner, "TITLE_EG"),
    titleTc: xmlChild(p.inner, "TITLE_TC"),
    remarkEg: xmlChild(p.inner, "REMARK_EG"),
    remarkTc: xmlChild(p.inner, "REMARK_TC"),
    url: xmlChild(p.inner, "REFERENCE_LINK"),
  }));
  return {
    eventCode: xmlChild(inner, "EVENT_CODE"),
    eventEg: xmlChild(inner, "EVENT_EG"),
    eventTc: xmlChild(inner, "EVENT_TC"),
    eventUrl: xmlChild(inner, "REFERENCE_LINK"),
    mainEg: xmlChild(main, "EG"),
    mainTc: xmlChild(main, "TC"),
    subEg: xmlChild(sub, "EG"),
    subTc: xmlChild(sub, "TC"),
    venueCode: xmlChild(loc, "VENUE_CODE"),
    venueEg: xmlChild(loc, "VENUE_EG"),
    venueTc: xmlChild(loc, "VENUE_TC"),
    cityEg: xmlChild(loc, "CITY_EG"),
    regionEg: xmlChild(loc, "REGION_EG"),
    regionTc: xmlChild(loc, "REGION_TC"),
    shows,
  };
}

export async function parseUrbtix(now: Date, xmlData: Uint8Array, cat: Catalog): Promise<Batch> {
  const xml = new TextDecoder().decode(xmlData);
  const m = meta();
  const batch: Batch = { events: [], errors: 0 };
  const events: ImportEvent[] = [];
  const eventsInner = xmlBlocks(xml, "EVENTS")[0]?.inner ?? xml;
  for (const block of xmlBlocks(eventsInner, "EVENT")) {
    const ev = parseEv(block.inner);
    if (skipEvent(ev)) {
      batch.errors++;
      continue;
    }
    const mapped = await mapEvent(now, ev, cat, m);
    if (!mapped) continue;
    batch.errors += mapped.skipped;
    events.push(mapped.event);
  }
  batch.events = mergeUrbtix(events);
  return batch;
}

function skipEvent(ev: UrbtixEv): boolean {
  const code = ev.eventCode.trim().toUpperCase();
  if (code === "LCEMP" || code.includes("OMNI")) return true;
  const blob = `${ev.eventEg} ${ev.eventTc}`.toLowerCase();
  if (
    blob.includes("e-museum pass") ||
    blob.includes("omnimax") ||
    blob.includes("sky show") ||
    blob.includes("exhibition pass")
  ) {
    return true;
  }
  const city = ev.cityEg.trim().toLowerCase();
  if (city && !city.includes("hong kong")) return true;
  return ev.venueEg.trim() === "-" && ev.venueTc.trim() === "-";
}

function parseShowTime(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return null;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) - 8 * 3600_000;
  return new Date(utc);
}

async function mapEvent(now: Date, ev: UrbtixEv, cat: Catalog, sourceMeta: SourceMeta): Promise<{ event: ImportEvent; skipped: number } | null> {
  let skipped = 0;
  type Slot = { session: Session; show: Show; legacy: string };
  const slots: Slot[] = [];
  for (const show of ev.shows) {
    const start = parseShowTime(show.datetime);
    if (!start) {
      skipped++;
      continue;
    }
    const end = new Date(start.getTime() + 2 * 3600_000);
    let legacy = `${ev.eventCode.trim()}-${show.refNo.trim()}`;
    if (legacy === "-") {
      const hkt = new Date(start.getTime() + 8 * 3600_000);
      const stamp = `${hkt.getUTCFullYear()}${String(hkt.getUTCMonth() + 1).padStart(2, "0")}${String(hkt.getUTCDate()).padStart(2, "0")}${String(hkt.getUTCHours()).padStart(2, "0")}${String(hkt.getUTCMinutes()).padStart(2, "0")}`;
      legacy = `${ev.eventCode.trim()}-${stamp}`;
    }
    if (!upcoming(end, now) || !withinHorizon(start, now)) continue;
    slots.push({ session: { start, end }, show, legacy });
  }
  if (!slots.length) return null;
  slots.sort((a, b) => a.session.start.getTime() - b.session.start.getTime());
  const first = slots[0]!;
  const titleEg = firstNonEmpty(first.show.titleEg, ev.eventEg);
  const titleTc = firstNonEmpty(first.show.titleTc, ev.eventTc);
  const title = text(titleTc, titleEg);
  if (Object.keys(title).length === 0) return { event: emptyEvent(), skipped: skipped + 1 };
  let sourceUrl = cleanLink(firstNonEmpty(first.show.url, ev.eventUrl));
  let generic = !sourceUrl;
  if (!sourceUrl) {
    sourceUrl = LISTING_URL;
    generic = true;
  }
  const resolved = resolveVenue(cat, ev.venueCode, ev.venueTc, ev.venueEg, ev.regionTc, ev.regionEg);
  let dist = districtFields(ev.regionTc.trim(), ev.regionEg.trim());
  if (!dist.district) {
    dist = districtFields(regionDistrict(ev.regionTc, ev.regionEg), regionEnglish(ev.regionTc, ev.regionEg));
  }
  const sessions = slots.map((s) => s.session);
  const replaces = slots.map((s) => s.legacy);
  const norm = normalizeSessions(sessions, new Date(0), new Date(0));
  const code = ev.eventCode.trim();
  const venueKey = firstNonEmpty(ev.venueCode, ev.venueTc, ev.venueEg);
  const event = emptyEvent();
  event.source = sourceMeta.id;
  event.externalId = await urbtixExternalId(code, venueKey);
  event.title = title;
  event.description = text(join3(ev.mainTc, ev.subTc, first.show.remarkTc), join3(ev.mainEg, ev.subEg, first.show.remarkEg));
  event.location = text(ev.venueTc.trim(), ev.venueEg.trim());
  event.startAt = norm.start;
  event.endAt = norm.end;
  event.type = TYPE_OFFICIAL;
  event.sourceUrl = sourceUrl;
  event.sourceUrlGeneric = generic;
  event.latitude = resolved.lat;
  event.longitude = resolved.lng;
  event.district = dist.district;
  event.districtI18n = dist.districtI18n;
  event.attribution = sourceMeta.attribution;
  event.dedupeTitleTc = ev.eventTc.trim();
  event.dedupeVenueTc = ev.venueTc.trim();
  event.dedupeVenueEn = ev.venueEg.trim();
  event.sessions = norm.sessions;
  event.replaces = replaces;
  if (code) event.foldedIds = [code];
  return { event, skipped };
}

async function urbtixExternalId(code: string, venue: string): Promise<string> {
  if (!code) return groupExternalID([venue]);
  return `${code}\0${venue}`;
}

function mergeUrbtix(events: ImportEvent[]): ImportEvent[] {
  const order: string[] = [];
  const byKey = new Map<string, { event: ImportEvent; code: string; venue: string }>();
  const venuesOf = new Map<string, Set<string>>();
  for (const event of events) {
    const { code, venue } = splitKey(event.externalId);
    const key = code ? `${code}\0${venue}` : event.externalId;
    if (code) {
      const set = venuesOf.get(code) ?? new Set();
      set.add(venue);
      venuesOf.set(code, set);
    }
    const have = byKey.get(key);
    if (have) {
      have.event.sessions.push(...event.sessions);
      have.event.replaces.push(...event.replaces);
      if (event.startAt < have.event.startAt) {
        const keepS = have.event.sessions;
        const keepR = have.event.replaces;
        have.event = event;
        have.event.sessions = keepS;
        have.event.replaces = keepR;
      }
    } else {
      order.push(key);
      byKey.set(key, { event, code, venue });
    }
  }
  const out: ImportEvent[] = [];
  for (const key of order) {
    const item = byKey.get(key)!;
    const norm = normalizeSessions(item.event.sessions, item.event.startAt, item.event.endAt);
    item.event.sessions = norm.sessions;
    item.event.startAt = norm.start;
    item.event.endAt = norm.end;
    if (item.code && (venuesOf.get(item.code)?.size ?? 0) <= 1) item.event.externalId = item.code;
    else if (item.code) item.event.externalId = `${item.code}:${foldLabel(item.venue)}`;
    out.push(item.event);
  }
  return out;
}

function splitKey(id: string): { code: string; venue: string } {
  const i = id.indexOf("\0");
  if (i >= 0) return { code: id.slice(0, i), venue: id.slice(i + 1) };
  return { code: id, venue: "" };
}

function join3(a: string, b: string, c: string): string {
  return [a, b, c].map((s) => s.trim()).filter(Boolean).join("\n");
}
function firstNonEmpty(...values: string[]): string {
  for (const v of values) {
    const t = v.trim();
    if (t) return t;
  }
  return "";
}
function regionEnglish(regionTc: string, regionEg: string): string {
  const eg = regionEg.trim();
  if (eg) return eg;
  switch (regionTc.trim()) {
    case "香港":
      return "Hong Kong Island";
    case "九龍":
      return "Kowloon";
    case "新界":
      return "New Territories";
    default:
      return "";
  }
}
