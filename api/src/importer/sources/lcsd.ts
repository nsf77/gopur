import { LOCALE_EN, LOCALE_ZH, type LocaleMap } from "../../i18n";
import { districtFields, text, TYPE_CLASS, TYPE_COMMUNITY, TYPE_OFFICIAL, type ImportEvent, type SourceMeta } from "../event";
import type { Fetcher } from "../fetch";
import { emptyEvent, type Batch, type Session } from "../types";
import { filterSessions, foldLabel, groupExternalID, normalizeSessions, onDay, upcoming, withinHorizon } from "../sessions";
import { cleanLink } from "../sourceurl";
import { hktDate } from "../time";
import { xmlBlocks, xmlChild, xmlChildren } from "../xml";

const EVENTS_URL = "https://www.lcsd.gov.hk/datagovhk/event/events.xml";
const DATES_URL = "https://www.lcsd.gov.hk/datagovhk/event/eventDates.xml";
const VENUES_URL = "https://www.lcsd.gov.hk/datagovhk/event/venues.xml";
const VENUE_LIST_URL = "https://www.lcsd.gov.hk/datagovhk/venue/venue.json";
const LISTING_URL = "https://www.lcsd.gov.hk/CE/CulturalService/Programme/tc/search.html";
const DETAIL_PREFIX = "https://www.lcsd.gov.hk/clpss/tc/search/culture/DetailForm.do?id=";
const HKPL_EN = "Hong Kong Public Libraries";
const HKPL_TC = "香港公共圖書館";

const TIME_RANGE = /(\d{1,2}):(\d{2})\s*[-–~]\s*(\d{1,2}):(\d{2})/g;
const CLOCK = /(\d{1,2}):(\d{2})/g;
const SPAN = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/;
const DAY = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
const AGE_MAX = /(\d+)\s*(?:years?|歲|岁)?\s*(?:old|或以上|以上)?/gi;

export function meta(): SourceMeta {
  return {
    id: "lcsd_cultural",
    username: "lcsd_cultural",
    displayName: "康文署文化節目",
    attribution: "資料來源：康樂及文化事務署 / DATA.GOV.HK",
    datasetUrl: "https://data.gov.hk/en-data/dataset/hk-lcsd-event-event-cultural",
    listingUrl: LISTING_URL,
  };
}

type Place = { Name_en: string; Name_cn: string; District_en: string; District_cn: string };
type VenueRow = { id: string; venuec: string; venuee: string; latitude: string; longitude: string };
type LcsdItem = {
  id: string;
  titlec: string;
  titlee: string;
  predateC: string;
  predateE: string;
  venueid: string;
  agelimitc: string;
  agelimite: string;
  pricec: string;
  pricee: string;
  descc: string;
  desce: string;
  urlc: string;
  urle: string;
  tagenturlc: string;
  tagenturle: string;
  presenterorgc: string;
  presenterorge: string;
  cat2: string;
};

type Draft = { event: ImportEvent; programmeId: string; titleKey: string; venueId: string; presenterKey: string };

export type LcsdAdapter = {
  now: () => Date;
  eventsUrl?: string;
  datesUrl?: string;
  venuesUrl?: string;
  venueListUrl?: string;
};

export async function fetchLcsd(a: LcsdAdapter, fetcher: Fetcher): Promise<Batch> {
  const eventsXml = await fetcher.get(a.eventsUrl ?? EVENTS_URL, 20 << 20);
  const datesXml = await fetcher.get(a.datesUrl ?? DATES_URL, 20 << 20);
  const venuesXml = await fetcher.get(a.venuesUrl ?? VENUES_URL, 20 << 20);
  let venueList: Uint8Array | undefined;
  try {
    venueList = await fetcher.get(a.venueListUrl ?? VENUE_LIST_URL, 20 << 20);
  } catch {
    venueList = undefined;
  }
  return parseLcsd(a.now(), eventsXml, datesXml, venuesXml, venueList);
}

function asText(u: Uint8Array): string {
  return new TextDecoder().decode(u);
}

function parseItem(block: { attrs: Record<string, string>; inner: string }): LcsdItem {
  const t = (tag: string) => xmlChild(block.inner, tag);
  return {
    id: (block.attrs.id ?? "").trim(),
    titlec: t("titlec"),
    titlee: t("titlee"),
    predateC: t("predateC"),
    predateE: t("predateE"),
    venueid: t("venueid"),
    agelimitc: t("agelimitc"),
    agelimite: t("agelimite"),
    pricec: t("pricec"),
    pricee: t("pricee"),
    descc: t("descc"),
    desce: t("desce"),
    urlc: t("urlc"),
    urle: t("urle"),
    tagenturlc: t("tagenturlc"),
    tagenturle: t("tagenturle"),
    presenterorgc: t("presenterorgc"),
    presenterorge: t("presenterorge"),
    cat2: t("cat2"),
  };
}

export async function parseLcsd(
  now: Date,
  eventsXml: Uint8Array,
  datesXml: Uint8Array,
  venuesXml: Uint8Array,
  venueList?: Uint8Array,
): Promise<Batch> {
  const eventsText = asText(eventsXml);
  if (!eventsText.includes("<events")) throw new Error("lcsd events.xml: unexpected format");
  const byDate = new Map<string, string[]>();
  const datesText = asText(datesXml).trim();
  if (datesText) {
    for (const ev of xmlBlocks(datesText, "event")) {
      byDate.set((ev.attrs.id ?? "").trim(), xmlChildren(ev.inner, "indate"));
    }
  }
  const byVenue = new Map<string, VenueRow>();
  const venuesText = asText(venuesXml).trim();
  if (venuesText) {
    for (const v of xmlBlocks(venuesText, "venue")) {
      const row: VenueRow = {
        id: (v.attrs.id ?? "").trim(),
        venuec: xmlChild(v.inner, "venuec"),
        venuee: xmlChild(v.inner, "venuee"),
        latitude: xmlChild(v.inner, "latitude"),
        longitude: xmlChild(v.inner, "longitude"),
      };
      byVenue.set(row.id, row);
    }
  }
  const places = parsePlaces(venueList);
  const m = meta();
  const batch: Batch = { events: [], errors: 0 };
  const drafts: Draft[] = [];
  for (const block of xmlBlocks(eventsText, "event")) {
    const item = parseItem(block);
    const dates = byDate.get(item.id) ?? [];
    const venue = byVenue.get(item.venueid.trim()) ?? {
      id: "",
      venuec: "",
      venuee: "",
      latitude: "",
      longitude: "",
    };
    const mapped = mapEvent(now, item, dates, venue, places, m);
    if (!mapped) continue;
    batch.errors += mapped.skipped;
    if (mapped.draft.programmeId) drafts.push(mapped.draft);
  }
  batch.events = await groupProgrammes(drafts);
  return batch;
}

function mapEvent(
  now: Date,
  item: LcsdItem,
  dates: string[],
  venue: VenueRow,
  places: Place[],
  sourceMeta: SourceMeta,
): { draft: Draft; skipped: number } | null {
  const emptyDraft = (): Draft => ({
    event: emptyEvent(),
    programmeId: "",
    titleKey: "",
    venueId: "",
    presenterKey: "",
  });
  if (skipProgramme(item)) return { draft: emptyDraft(), skipped: 1 };
  const title = text(item.titlec, item.titlee);
  if (Object.keys(title).length === 0) return { draft: emptyDraft(), skipped: 1 };
  const predate = `${item.predateE}\n${item.predateC}`;
  const clock = scheduleClock(predate);
  const price = isFree(item.pricec, item.pricee) ? 0 : null;
  const hkpl = isHkpl(item);
  const orgZh = hkpl ? HKPL_TC : item.presenterorgc;
  const orgEn = hkpl ? HKPL_EN : item.presenterorge;
  const organizer = text(orgZh, orgEn);
  const titleKey = groupTitle(title);
  const presenterKey = groupTitle(organizer);
  const desc = text(
    join4(item.descc, presenterLine("主辦", item.presenterorgc), priceLine(item.pricec), ageLine(item.agelimitc), item.predateC),
    join4(item.desce, presenterLine("Presented by", item.presenterorge), priceLine(item.pricee), ageLine(item.agelimite), item.predateE),
  );
  const location = text(venue.venuec, venue.venuee);
  const { lat, lng } = coords(venue.latitude, venue.longitude);
  const dist = matchDistrict(venue.venuec, venue.venuee, places);
  const id = item.id.trim();
  if (!id) return { draft: emptyDraft(), skipped: 1 };
  const { sourceUrl, generic } = eventLink(id, item, hkpl);
  const eventType = programmeType(item);
  const owner = hkpl ? "hkpl" : "";
  const slots = occurrences(id, dates, predate, clock);
  if (slots.length === 0) return { draft: emptyDraft(), skipped: 1 };
  const sessions: Session[] = [];
  const replaces: string[] = [];
  for (const slot of slots) {
    if (slot.externalId !== id) replaces.push(slot.externalId);
    if (upcoming(slot.end, now) && withinHorizon(slot.start, now)) {
      sessions.push({ start: slot.start, end: slot.end });
    }
  }
  const filtered = filterSessions(sessions, now);
  if (filtered.length === 0) return { draft: emptyDraft(), skipped: 0 };
  const norm = normalizeSessions(filtered, new Date(0), new Date(0));
  const ev = emptyEvent();
  ev.source = sourceMeta.id;
  ev.externalId = id;
  ev.title = title;
  ev.description = desc;
  ev.location = location;
  ev.startAt = norm.start;
  ev.endAt = norm.end;
  ev.type = eventType;
  ev.priceCents = price;
  ev.sourceUrl = sourceUrl;
  ev.sourceUrlGeneric = generic;
  ev.latitude = lat;
  ev.longitude = lng;
  ev.district = dist.district;
  ev.districtI18n = dist.districtI18n;
  ev.attribution = sourceMeta.attribution;
  ev.organizer = organizer;
  ev.ownerUsername = owner;
  ev.sessions = norm.sessions;
  ev.foldedIds = [id];
  ev.replaces = replaces;
  return {
    draft: { event: ev, programmeId: id, titleKey, venueId: item.venueid.trim(), presenterKey },
    skipped: 0,
  };
}

async function groupProgrammes(drafts: Draft[]): Promise<ImportEvent[]> {
  const order: string[] = [];
  const buckets = new Map<string, Draft[]>();
  for (const d of drafts) {
    const k = `${d.titleKey}\0${d.venueId}\0${d.presenterKey}`;
    if (!buckets.has(k)) order.push(k);
    const arr = buckets.get(k) ?? [];
    arr.push(d);
    buckets.set(k, arr);
  }
  const out: ImportEvent[] = [];
  for (const k of order) {
    const group = buckets.get(k)!;
    if (group.length === 1) {
      out.push(group[0]!.event);
      continue;
    }
    let best = 0;
    for (let i = 1; i < group.length; i++) {
      if (group[i]!.event.startAt < group[best]!.event.startAt) best = i;
    }
    const event = { ...group[best]!.event };
    const sessions: Session[] = [];
    const folded: string[] = [];
    const replaces: string[] = [];
    const [titleKey, venueId, presenterKey] = k.split("\0");
    for (const d of group) {
      sessions.push(...d.event.sessions);
      folded.push(d.programmeId);
      replaces.push(...d.event.replaces);
      if (d.programmeId) replaces.push(d.programmeId);
    }
    const norm = normalizeSessions(sessions, new Date(0), new Date(0));
    event.sessions = norm.sessions;
    event.startAt = norm.start;
    event.endAt = norm.end;
    event.foldedIds = folded;
    event.replaces = replaces;
    event.externalId = await groupExternalID([titleKey ?? "", venueId ?? "", presenterKey ?? ""]);
    out.push(event);
  }
  return out;
}

type Slot = { start: Date; end: Date; externalId: string };

type Clock = { sh: number; sm: number; eh: number; em: number; has: boolean };

function occurrences(id: string, dates: string[], predate: string, clock: Clock): Slot[] {
  const out: Slot[] = [];
  const seen = new Set<string>();
  for (const raw0 of dates) {
    const raw = raw0.trim();
    if (raw.length !== 8 || seen.has(raw)) continue;
    const y = Number(raw.slice(0, 4));
    const mo = Number(raw.slice(4, 6));
    const d = Number(raw.slice(6, 8));
    const day = hktDate(y, mo, d);
    if (!day) continue;
    seen.add(raw);
    const t = occurrenceTimes(day, clock);
    out.push({ start: t.start, end: t.end, externalId: `${id}:${raw}` });
  }
  if (out.length) return out;
  const span = SPAN.exec(predate);
  if (span) {
    const s = ymd(span[3]!, span[2]!, span[1]!);
    const e = ymd(span[6]!, span[5]!, span[4]!);
    if (s && e && e >= s) {
      let times = occurrenceTimes(s, clock);
      if (!clock.has) {
        times = { start: onDay(s, 0, 0, 0), end: onDay(e, 23, 59, 59) };
      }
      return [{ start: times.start, end: times.end, externalId: id }];
    }
  }
  const dayM = DAY.exec(predate);
  if (dayM) {
    const day = ymd(dayM[3]!, dayM[2]!, dayM[1]!);
    if (day) {
      const t = occurrenceTimes(day, clock);
      return [{ start: t.start, end: t.end, externalId: id }];
    }
  }
  return [];
}

function occurrenceTimes(day: Date, clock: Clock): { start: Date; end: Date } {
  if (!clock.has) return { start: onDay(day, 0, 0, 0), end: onDay(day, 23, 59, 59) };
  const start = onDay(day, clock.sh, clock.sm, 0);
  let end = onDay(day, clock.eh, clock.em, 0);
  if (end <= start) end = new Date(start.getTime() + 2 * 3600_000);
  return { start, end };
}

function scheduleClock(text: string): Clock {
  const ranges: Array<[[number, number], [number, number]]> = [];
  for (const c of text.matchAll(TIME_RANGE)) {
    const a = hm(c[1]!, c[2]!);
    const b = hm(c[3]!, c[4]!);
    if (a && b) ranges.push([a, b]);
  }
  if (ranges.length) {
    let shm = ranges[0]![0];
    let ehm = ranges[0]![1];
    for (const [a, b] of ranges.slice(1)) {
      if (mins(a[0], a[1]) < mins(shm[0], shm[1])) shm = a;
      if (mins(b[0], b[1]) > mins(ehm[0], ehm[1])) ehm = b;
    }
    return { sh: shm[0], sm: shm[1], eh: ehm[0], em: ehm[1], has: true };
  }
  const clocks: Array<[number, number]> = [];
  for (const c of text.matchAll(CLOCK)) {
    const v = hm(c[1]!, c[2]!);
    if (v) clocks.push(v);
  }
  if (!clocks.length) return { sh: 0, sm: 0, eh: 0, em: 0, has: false };
  let first = clocks[0]!;
  let last = first;
  for (const c of clocks.slice(1)) {
    if (mins(c[0], c[1]) < mins(first[0], first[1])) first = c;
    if (mins(c[0], c[1]) > mins(last[0], last[1])) last = c;
  }
  if (last[0] === first[0] && last[1] === first[1]) {
    const end = mins(first[0], first[1]) + 120;
    return { sh: first[0], sm: first[1], eh: Math.floor(end / 60), em: end % 60, has: true };
  }
  return { sh: first[0], sm: first[1], eh: last[0], em: last[1], has: true };
}

function hm(h: string, m: string): [number, number] | null {
  const hv = Number(h);
  const mv = Number(m);
  if (!Number.isInteger(hv) || !Number.isInteger(mv) || hv > 23 || mv > 59) return null;
  return [hv, mv];
}
function mins(h: number, m: number): number {
  return h * 60 + m;
}
function ymd(y: string, m: string, d: string): Date | null {
  return hktDate(Number(y), Number(m), Number(d));
}
function isFree(zh: string, en: string): boolean {
  const b = (zh + " " + en).toLowerCase();
  return zh.includes("免費") || zh.includes("免费") || b.includes("free");
}
function presenterLine(l: string, n: string): string {
  n = n.trim();
  return n ? `${l}: ${n}` : "";
}
function priceLine(p: string): string {
  p = p.trim();
  if (!p || isFree(p, p)) return "";
  return p;
}
function ageLine(age: string): string {
  age = age.trim();
  if (!age || age === "不適用" || age.toLowerCase() === "not applicable") return "";
  return age;
}
function coords(lat: string, lng: string): { lat: number | null; lng: number | null } {
  const a = Number(lat.trim());
  const b = Number(lng.trim());
  if (!Number.isFinite(a) || !Number.isFinite(b) || (a === 0 && b === 0)) return { lat: null, lng: null };
  return { lat: a, lng: b };
}
function join4(...parts: string[]): string {
  return parts.map((s) => s.trim()).filter(Boolean).join("\n");
}
function groupTitle(m: LocaleMap): string {
  const zh = m[LOCALE_ZH];
  if (zh && zh.trim()) return foldLabel(zh);
  return foldLabel(m[LOCALE_EN] ?? "");
}
function isHkpl(item: LcsdItem): boolean {
  return item.presenterorge.includes(HKPL_EN) || item.presenterorgc.includes(HKPL_TC);
}
function skipProgramme(item: LcsdItem): boolean {
  if (isHkpl(item) && (item.cat2.trim() === "inc7sc3" || item.cat2.trim() === "inc7sc8")) return true;
  return kidsOnly(item.agelimitc, item.agelimite);
}
function programmeType(item: LcsdItem): string {
  if (item.cat2.trim() === "inc4sc14") return TYPE_CLASS;
  if (isHkpl(item)) return TYPE_COMMUNITY;
  return TYPE_OFFICIAL;
}
function kidsOnly(a: string, b: string): boolean {
  let m = ageUpper(a);
  if (m === 0) m = ageUpper(b);
  return m > 0 && m < 13;
}
function ageUpper(t: string): number {
  t = t.trim();
  if (!t || t === "不適用" || t.toLowerCase() === "not applicable") return 0;
  let best = 0;
  for (const c of t.matchAll(AGE_MAX)) {
    const n = Number(c[1]);
    if (!Number.isFinite(n)) continue;
    if (t.toLowerCase().includes("below") || t.includes("以下")) return n;
    if (n > best) best = n;
  }
  if (t.includes("0-12") || t.includes("0至12")) return 12;
  return best;
}
function parsePlaces(raw?: Uint8Array): Place[] {
  if (!raw) return [];
  try {
    return JSON.parse(asText(raw)) as Place[];
  } catch {
    return [];
  }
}
function matchDistrict(zh: string, en: string, places: Place[]): { district: string; districtI18n: LocaleMap } {
  zh = zh.trim();
  en = en.trim().toLowerCase();
  let best = "";
  let bestLen = 0;
  let bzh = "";
  let ben = "";
  for (const p of places) {
    const cn = p.Name_cn.trim();
    if ([...cn].length >= 2 && zh && zh.includes(cn) && [...cn].length > bestLen) {
      const d = firstNonempty(p.District_cn, p.District_en);
      if (d) {
        best = d;
        bestLen = [...cn].length;
        bzh = p.District_cn;
        ben = p.District_en;
      }
    }
    const ename = p.Name_en.trim();
    const enLen = new TextEncoder().encode(ename).length;
    if (ename.length >= 4 && en && en.includes(ename.toLowerCase()) && enLen > bestLen) {
      const d = firstNonempty(p.District_cn, p.District_en);
      if (d) {
        best = d;
        bestLen = enLen;
        bzh = p.District_cn;
        ben = p.District_en;
      }
    }
  }
  if (!best) return { district: "", districtI18n: {} };
  const fields = districtFields(bzh, ben);
  return { district: fields.district || best, districtI18n: fields.districtI18n };
}
function firstNonempty(a: string, b: string): string {
  a = a.trim();
  if (a) return a;
  return b.trim();
}
function eventLink(id: string, item: LcsdItem, hkpl: boolean): { sourceUrl: string; generic: boolean } {
  if (hkpl) {
    for (const raw of [item.urle, item.urlc]) {
      const l = hkplLink(raw);
      if (l) return { sourceUrl: l, generic: true };
    }
  }
  for (const raw of [item.tagenturle, item.tagenturlc, item.urle, item.urlc]) {
    const l = bookingLink(raw);
    if (l) return { sourceUrl: l, generic: false };
  }
  if (id) return { sourceUrl: DETAIL_PREFIX + encodeURIComponent(id), generic: false };
  return { sourceUrl: LISTING_URL, generic: true };
}
function bookingLink(raw: string): string | null {
  const link = cleanLink(raw);
  if (!link) return null;
  let u: URL;
  try {
    u = new URL(link);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const path = u.pathname.toLowerCase();
  const urbtixHost = host === "urbtix.hk" || host === "www.urbtix.hk";
  const artMateHost = host === "art-mate.net" || host === "www.art-mate.net";
  const direct =
    (urbtixHost &&
      (path.includes("event-detail") || path.includes("performance-detail") || path.includes("eventdetail"))) ||
    (artMateHost && path.includes("/doc/")) ||
    host === "docs.google.com" ||
    host === "forms.gle";
  if (direct) return link;
  if (host.includes("hkticketing") && path !== "/" && path.length > 0) return link;
  return null;
}
function hkplLink(raw: string): string | null {
  const link = cleanLink(raw);
  try {
    const u = new URL(link);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();
    if (host.includes("hkpl.gov.hk") && (path.includes("extension-activities") || path.includes("all-events/search"))) {
      return link;
    }
  } catch {
    return null;
  }
  return null;
}
