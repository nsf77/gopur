import { LOCALE_EN, LOCALE_ZH } from "../../i18n";
import { sha256Hex } from "../sha";
import { text, TYPE_OFFICIAL, type ImportEvent, type SourceMeta } from "../event";
import type { Fetcher } from "../fetch";
import { emptyEvent, type Batch } from "../types";
import { foldLabel, groupExternalID, normalizeSessions, upcoming, withinHorizon } from "../sessions";
import { cleanLink } from "../sourceurl";
import { hktDate } from "../time";

const CSV_URL = "https://www.cstb.gov.hk/datagovhk/cstbdiv011/resource.csv";
const LISTING_URL = "https://www.mevents.org.hk/en/calendar.php";
const CROSS_MONTH = /^(\d{1,2})\/(\d{1,2})-(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const SAME_MONTH = /^(\d{1,2})(?:-(\d{1,2}))?\/(\d{1,2})\/(\d{4})$/;

export function meta(): SourceMeta {
  return {
    id: "m_mark",
    username: "m_mark",
    displayName: "「M」品牌大型活動",
    attribution: "資料來源：文化體育及旅遊局 / DATA.GOV.HK",
    datasetUrl: CSV_URL,
    listingUrl: LISTING_URL,
  };
}

export async function fetchMmark(now: () => Date, fetcher: Fetcher): Promise<Batch> {
  const body = await fetcher.get(CSV_URL, 4 << 20);
  return parseMmark(now(), body);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
      continue;
    }
    if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (ch !== "\r") cur += ch;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

export async function parseMmark(now: Date, body: Uint8Array): Promise<Batch> {
  const rows = parseCsv(new TextDecoder().decode(body));
  if (!rows.length) throw new Error("m mark csv: missing date_en column");
  const header: Record<string, number> = {};
  rows[0]!.forEach((name, i) => {
    header[name.replace(/^\uFEFF/, "").trim()] = i;
  });
  for (const req of ["date_en", "event_name_en", "event_name_tc"]) {
    if (header[req] == null) throw new Error(`m mark csv: missing ${req} column`);
  }
  const batch: Batch = { events: [], errors: 0 };
  const events: ImportEvent[] = [];
  for (const row of rows.slice(1)) {
    if (row.every((c) => !c.trim())) continue;
    const outcome = await mapRow(now, header, row);
    if (outcome === "bad") batch.errors++;
    else if (outcome !== "skip") events.push(outcome);
  }
  batch.events = groupRows(events);
  return batch;
}

function field(header: Record<string, number>, row: string[], name: string): string {
  const i = header[name];
  if (i == null) return "";
  return (row[i] ?? "").trim();
}

async function mapRow(now: Date, header: Record<string, number>, row: string[]) {
  let dateRaw = field(header, row, "date_en");
  if (!dateRaw) dateRaw = field(header, row, "date_tc");
  const range = parseRange(dateRaw);
  if (!range) return "bad" as const;
  if (!upcoming(range.end, now) || !withinHorizon(range.start, now)) return "skip" as const;
  const nameEn = field(header, row, "event_name_en");
  const nameTc = field(header, row, "event_name_tc");
  if (!nameEn.trim() && !nameTc.trim()) return "bad" as const;
  const venueEn = field(header, row, "venue_en");
  const venueTc = field(header, row, "venue_tc");
  const orgEn = field(header, row, "organizer_en");
  const orgTc = field(header, row, "organizer_tc");
  const { sourceUrl, generic } = websiteLink(field(header, row, "website"));
  const title = text(nameTc, nameEn);
  const venueLabel = firstLabel(venueEn, venueTc);
  const titleKey = firstLabel(title[LOCALE_ZH] ?? "", title[LOCALE_EN] ?? "");
  const m = meta();
  const ev = emptyEvent();
  ev.source = m.id;
  ev.externalId = await groupExternalID([foldLabel(titleKey), foldLabel(venueLabel)]);
  ev.title = title;
  ev.description = text(organizerLine("主辦", orgTc), organizerLine("Presented by", orgEn));
  ev.location = text(venueTc, venueEn);
  ev.startAt = range.start;
  ev.endAt = range.end;
  ev.type = TYPE_OFFICIAL;
  ev.sourceUrl = sourceUrl;
  ev.sourceUrlGeneric = generic;
  ev.attribution = m.attribution;
  ev.organizer = text(orgTc, orgEn);
  ev.sessions = [{ start: range.start, end: range.end }];
  ev.replaces = [await idFor(nameEn, dateRaw, venueEn)];
  return ev;
}

function groupRows(events: ImportEvent[]): ImportEvent[] {
  const order: string[] = [];
  const byId = new Map<string, ImportEvent>();
  for (const event of events) {
    const id = event.externalId;
    const have = byId.get(id);
    if (have) {
      have.sessions.push(...event.sessions);
      have.replaces.push(...event.replaces);
      if (event.startAt < have.startAt) {
        const sessions = have.sessions;
        const replaces = have.replaces;
        const merged = event;
        merged.sessions = sessions;
        merged.replaces = replaces;
        byId.set(id, merged);
      }
    } else {
      order.push(id);
      byId.set(id, event);
    }
  }
  const out: ImportEvent[] = [];
  for (const id of order) {
    const event = byId.get(id)!;
    const norm = normalizeSessions(event.sessions, event.startAt, event.endAt);
    event.sessions = norm.sessions;
    event.startAt = norm.start;
    event.endAt = norm.end;
    out.push(event);
  }
  return out;
}

export function parseRange(raw: string): { start: Date; end: Date } | null {
  raw = raw.trim();
  const c = CROSS_MONTH.exec(raw);
  if (c) {
    const sd = Number(c[1]);
    const sm = Number(c[2]);
    const ed = Number(c[3]);
    const em = Number(c[4]);
    const year = Number(c[5]);
    let startYear = year;
    if (sm > em) startYear = year - 1;
    const start = hktDate(startYear, sm, sd, 0, 0, 0);
    const end = hktDate(year, em, ed, 23, 59, 59);
    if (!start || !end || end < start) return null;
    return { start, end };
  }
  const s = SAME_MONTH.exec(raw);
  if (s) {
    const sd = Number(s[1]);
    const ed = s[2] ? Number(s[2]) : sd;
    const month = Number(s[3]);
    const year = Number(s[4]);
    const start = hktDate(year, month, sd, 0, 0, 0);
    const end = hktDate(year, month, ed, 23, 59, 59);
    if (!start || !end || end < start) return null;
    return { start, end };
  }
  return null;
}

function organizerLine(label: string, name: string): string {
  name = name.trim();
  return name ? `${label}: ${name}` : "";
}
function websiteLink(raw: string): { sourceUrl: string; generic: boolean } {
  const link = cleanLink(raw);
  if (link) return { sourceUrl: link, generic: false };
  return { sourceUrl: LISTING_URL, generic: true };
}
function firstLabel(...values: string[]): string {
  for (const v of values) {
    const t = v.trim();
    if (t) return t;
  }
  return "";
}
async function idFor(name: string, dateRaw: string, venue: string): Promise<string> {
  return sha256Hex(`${name.trim()}\n${dateRaw.trim()}\n${venue.trim()}`);
}
