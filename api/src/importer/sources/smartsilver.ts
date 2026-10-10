import { districtFields, text, TYPE_CLASS, type ImportEvent, type SourceMeta } from "../event";
import type { Fetcher } from "../fetch";
import { emptyEvent, type Batch, type Session } from "../types";
import { normalizeSessions, onDay, upcoming, withinHorizon } from "../sessions";
import { cleanLink } from "../sourceurl";

const TC_URL =
  "https://www.digitalpolicy.gov.hk/open_data/ict_programmes_for_elderly/enriched-ict-training-programme-elderly-courses-tc.json";
const EN_URL =
  "https://www.digitalpolicy.gov.hk/open_data/ict_programmes_for_elderly/enriched-ict-training-programme-elderly-courses-en.json";
const LISTING_URL = "https://www.it2.gov.hk/tc/community_digital_support/training_courses.php?t=a";
const SILVER_TIME_FIX = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}):\d{2}(Z|[+-]\d{2}:\d{2})$/;

export function meta(): SourceMeta {
  return {
    id: "smart_silver",
    username: "smart_silver",
    displayName: "智友善長進數碼課程",
    attribution: "資料來源：數字政策辦公室 / DATA.GOV.HK",
    datasetUrl: TC_URL,
    listingUrl: LISTING_URL,
  };
}

type SessionRow = { Sequence?: number; Date?: string; StartTime?: string; EndTime?: string };
type Course = {
  ID?: string;
  District?: string;
  OrgName?: string;
  CourseName?: string;
  EnrolmentMethod?: string[];
  StartDate?: string;
  EndDate?: string;
  ClassSchedule?: string;
  Sessions?: SessionRow[];
  VenueAddress?: string;
  OnlineEnrolmentURL?: string;
};

export async function fetchSmartsilver(now: () => Date, fetcher: Fetcher): Promise<Batch> {
  const tcBody = await fetcher.get(TC_URL, 8 << 20);
  let enBody: Uint8Array | undefined;
  try {
    enBody = await fetcher.get(EN_URL, 8 << 20);
  } catch {
    enBody = undefined;
  }
  return parseSmartsilver(now(), tcBody, enBody);
}

function decode(body: Uint8Array): Course[] {
  let buf = body;
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) buf = buf.subarray(3);
  const trimmed = new TextDecoder().decode(buf).trim();
  if (!trimmed) throw new Error("empty file");
  if (!trimmed.startsWith("[")) throw new Error("expected a JSON array");
  return JSON.parse(trimmed) as Course[];
}

export function parseSmartsilver(now: Date, tcBody: Uint8Array, enBody?: Uint8Array): Batch {
  const tc = decode(tcBody);
  const enById = new Map<string, Course>();
  if (enBody) {
    try {
      for (const c of decode(enBody)) enById.set(c.ID ?? "", c);
    } catch {
      /* warning: broken English file */
    }
  }
  const m = meta();
  const batch: Batch = { events: [], errors: 0 };
  for (const course of tc) {
    const en = enById.get(course.ID ?? "") ?? { ID: course.ID };
    const { events, skipped } = mapCourse(now, course, en, m);
    batch.events.push(...events);
    batch.errors += skipped;
  }
  return batch;
}

function mapCourse(now: Date, tc: Course, en: Course, sourceMeta: SourceMeta): { events: ImportEvent[]; skipped: number } {
  const id = (tc.ID ?? "").trim();
  if (!id) return { events: [], skipped: 1 };
  const title = text(fallback(tc.CourseName, en.CourseName), fallback(en.CourseName, tc.CourseName));
  const description = text(
    join3(tc.OrgName, tc.ClassSchedule, joinList(tc.EnrolmentMethod)),
    join3(en.OrgName, en.ClassSchedule, joinList(en.EnrolmentMethod)),
  );
  const location = text(fallback(tc.VenueAddress, en.VenueAddress), fallback(en.VenueAddress, tc.VenueAddress));
  const dist = districtFields(tc.District ?? "", en.District ?? "");
  const { sourceUrl, generic } = enrolLink(tc.OnlineEnrolmentURL ?? "", en.OnlineEnrolmentURL ?? "");
  const organizer = text(tc.OrgName ?? "", en.OrgName ?? "");
  let sessions = tc.Sessions ?? [];
  if (!sessions.length) sessions = en.Sessions ?? [];
  if (!sessions.length) {
    const span = dateSpan(tc.StartDate ?? "", tc.EndDate ?? "");
    if (!span) return { events: [], skipped: 0 };
    if (!upcoming(span.end, now) || !withinHorizon(span.start, now)) return { events: [], skipped: 0 };
    const ev = baseEvent(sourceMeta, id, title, description, location, dist, organizer, sourceUrl, generic, span.start, span.end);
    ev.sessions = [{ start: span.start, end: span.end }];
    ev.foldedIds = [id];
    return { events: [ev], skipped: 0 };
  }
  const slots: Session[] = [];
  const replaces: string[] = [];
  let skipped = 0;
  for (const session of sessions) {
    const times = sessionTimes(session);
    if (!times) {
      skipped++;
      continue;
    }
    let seq = session.Sequence ?? 0;
    if (seq === 0) seq = replaces.length + 1;
    replaces.push(`${id}:${seq}`);
    if (!upcoming(times.end, now) || !withinHorizon(times.start, now)) continue;
    slots.push({ start: times.start, end: times.end });
  }
  if (!slots.length) return { events: [], skipped };
  const norm = normalizeSessions(slots, new Date(0), new Date(0));
  const ev = baseEvent(sourceMeta, id, title, description, location, dist, organizer, sourceUrl, generic, norm.start, norm.end);
  ev.sessions = norm.sessions;
  ev.foldedIds = [id];
  ev.replaces = replaces;
  return { events: [ev], skipped };
}

function baseEvent(
  sourceMeta: SourceMeta,
  id: string,
  title: ImportEvent["title"],
  description: ImportEvent["description"],
  location: ImportEvent["location"],
  dist: { district: string; districtI18n: ImportEvent["districtI18n"] },
  organizer: ImportEvent["organizer"],
  sourceUrl: string,
  generic: boolean,
  start: Date,
  end: Date,
): ImportEvent {
  const ev = emptyEvent();
  ev.source = sourceMeta.id;
  ev.externalId = id;
  ev.title = title;
  ev.description = description;
  ev.location = location;
  ev.startAt = start;
  ev.endAt = end;
  ev.type = TYPE_CLASS;
  ev.sourceUrl = sourceUrl;
  ev.sourceUrlGeneric = generic;
  ev.district = dist.district;
  ev.districtI18n = dist.districtI18n;
  ev.attribution = sourceMeta.attribution;
  ev.organizer = organizer;
  return ev;
}

function enrolLink(tcUrl: string, enUrl: string): { sourceUrl: string; generic: boolean } {
  for (const raw of [tcUrl, enUrl]) {
    const link = cleanLink(raw);
    if (link) return { sourceUrl: link, generic: false };
  }
  return { sourceUrl: LISTING_URL, generic: true };
}

function dateSpan(startRaw: string, endRaw: string): { start: Date; end: Date } | null {
  const startD = parseYmd(startRaw);
  if (!startD) return null;
  let endD = startD;
  if (endRaw.trim()) {
    const e = parseYmd(endRaw);
    if (!e) return null;
    endD = e;
  }
  return { start: onDay(startD, 0, 0, 0), end: onDay(endD, 23, 59, 59) };
}

function parseYmd(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - 8 * 3600_000);
}

function sessionTimes(session: SessionRow): { start: Date; end: Date } | null {
  const start = parseStamp(session.StartTime ?? "");
  if (start) {
    let end = parseStamp(session.EndTime ?? "") ?? new Date(start.getTime() + 2 * 3600_000);
    if (end <= start) end = new Date(start.getTime() + 2 * 3600_000);
    return { start, end };
  }
  if (!(session.Date ?? "").trim()) return null;
  const day = parseYmd(session.Date ?? "");
  if (!day) return null;
  return { start: onDay(day, 0, 0, 0), end: onDay(day, 23, 59, 59) };
}

function parseStamp(raw: string): Date | null {
  let s = raw.trim();
  const fix = SILVER_TIME_FIX.exec(s);
  if (fix) s = `${fix[1]}${fix[2]}`;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function fallback(primary?: string, other?: string): string {
  const p = (primary ?? "").trim();
  return p || (other ?? "").trim();
}
function joinList(values?: string[]): string {
  return (values ?? []).map((s) => s.trim()).filter(Boolean).join(", ");
}
function join3(a?: string, b?: string, c?: string): string {
  return [a, b, c].map((s) => (s ?? "").trim()).filter(Boolean).join("\n");
}
