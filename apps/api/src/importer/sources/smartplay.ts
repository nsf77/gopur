import { districtFields, text, TYPE_CLASS, TYPE_COMMUNITY, type SourceMeta } from "../event";
import type { Fetcher } from "../fetch";
import { emptyEvent, type Batch } from "../types";
import { onDay, upcoming } from "../sessions";
import { cleanLink } from "../sourceurl";

const FILE_URL =
  "https://data.smartplay.lcsd.gov.hk/rest/cms/api/v1/publ/contents/open-data/activity-prog/file";
const LISTING_URL = "https://www.smartplay.lcsd.gov.hk/programme/search-result";
const DETAIL_URL = "https://www.smartplay.lcsd.gov.hk/programme/detail?activityNo=";

export function meta(): SourceMeta {
  return {
    id: "smartplay",
    username: "lcsd_smartplay",
    displayName: "康文署智方便活動",
    attribution: "資料來源：康樂及文化事務署 / DATA.GOV.HK",
    datasetUrl: FILE_URL,
    listingUrl: LISTING_URL,
  };
}

type Programme = {
  ACTIVITY_NO?: string;
  TC_PGM_NAME?: string;
  EN_PGM_NAME?: string;
  TC_ACT_TYPE_NAME?: string;
  EN_ACT_TYPE_NAME?: string;
  TC_DISTRICT?: string;
  EN_DISTRICT?: string;
  PGM_START_DATE?: string;
  PGM_END_DATE?: string;
  TC_DAY?: string;
  EN_DAY?: string;
  PGM_START_TIME?: string;
  PGM_END_TIME?: string;
  TC_VENUE?: string;
  EN_VENUE?: string;
  TC_TARGET_GRP?: string;
  EN_TARGET_GRP?: string;
  FEE?: number | null;
  ENROL_METHOD?: string;
  TC_NOTES?: unknown;
  EN_NOTES?: unknown;
  TC_URL?: string;
  EN_URL?: string;
};

function noteText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join("\n");
  return "";
}

export async function fetchSmartplay(now: () => Date, fetcher: Fetcher): Promise<Batch> {
  const body = await fetcher.get(FILE_URL, 40 << 20);
  return parseSmartplay(now(), body);
}

export function parseSmartplay(now: Date, body: Uint8Array): Batch {
  let arr: unknown;
  try {
    arr = JSON.parse(new TextDecoder().decode(body));
  } catch (e) {
    throw new Error(`smartplay: ${String(e)}`);
  }
  if (!Array.isArray(arr)) throw new Error("smartplay: expected a JSON array");
  const m = meta();
  const batch: Batch = { events: [], errors: 0 };
  for (const item of arr) {
    if (!item || typeof item !== "object") {
      batch.errors++;
      continue;
    }
    const outcome = mapProgramme(now, item as Programme, m);
    if (outcome === "bad") batch.errors++;
    else if (outcome !== "skip") batch.events.push(outcome);
  }
  return batch;
}

function mapProgramme(now: Date, item: Programme, sourceMeta: SourceMeta) {
  if (!wanted(item)) return "skip" as const;
  const day = parseYmd(item.PGM_START_DATE ?? "");
  if (!day) return "bad" as const;
  const wd = new Date(day.getTime() + 8 * 3600_000).getUTCDay();
  if (wd !== 0 && wd !== 6) return "skip" as const;
  const times = dayTimes(day, item.PGM_START_TIME ?? "", item.PGM_END_TIME ?? "");
  if (!times) return "bad" as const;
  if (!upcoming(times.end, now)) return "skip" as const;
  const id = (item.ACTIVITY_NO ?? "").trim();
  if (!id) return "bad" as const;
  const { sourceUrl, generic } = programmeLink(id, item.TC_URL ?? "", item.EN_URL ?? "");
  const nameBlob = `${item.TC_PGM_NAME ?? ""} ${item.EN_PGM_NAME ?? ""} ${item.TC_ACT_TYPE_NAME ?? ""} ${item.EN_ACT_TYPE_NAME ?? ""}`;
  let eventType = TYPE_COMMUNITY;
  if (nameBlob.includes("班") || nameBlob.toLowerCase().includes("class") || nameBlob.toLowerCase().includes("course")) {
    eventType = TYPE_CLASS;
  }
  const dist = districtFields(item.TC_DISTRICT ?? "", item.EN_DISTRICT ?? "");
  const ev = emptyEvent();
  ev.source = sourceMeta.id;
  ev.externalId = id;
  ev.title = text(item.TC_PGM_NAME ?? "", item.EN_PGM_NAME ?? "");
  ev.description = text(
    joinParts([item.TC_ACT_TYPE_NAME, item.TC_TARGET_GRP, item.TC_DAY, noteText(item.TC_NOTES)]),
    joinParts([item.EN_ACT_TYPE_NAME, item.EN_TARGET_GRP, item.EN_DAY, noteText(item.EN_NOTES)]),
  );
  ev.location = text(item.TC_VENUE ?? "", item.EN_VENUE ?? "");
  ev.startAt = times.start;
  ev.endAt = times.end;
  ev.type = eventType;
  ev.priceCents = 0;
  ev.sourceUrl = sourceUrl;
  ev.sourceUrlGeneric = generic;
  ev.district = dist.district;
  ev.districtI18n = dist.districtI18n;
  ev.attribution = sourceMeta.attribution;
  return ev;
}

function wanted(item: Programme): boolean {
  const method = (item.ENROL_METHOD ?? "").trim().toUpperCase();
  if (method !== "WALKIN" && method !== "FCFS") return false;
  if (item.FEE == null || item.FEE > 0) return false;
  const s = (item.PGM_START_DATE ?? "").trim();
  const e = (item.PGM_END_DATE ?? "").trim();
  return !!s && s === e;
}

function parseYmd(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - 8 * 3600_000);
}

function dayTimes(day: Date, startRaw: string, endRaw: string): { start: Date; end: Date } | null {
  const startC = clock(startRaw);
  if (!startC) return null;
  const start = onDay(day, startC[0], startC[1], 0);
  if (!endRaw.trim()) return { start, end: new Date(start.getTime() + 2 * 3600_000) };
  const endC = clock(endRaw);
  if (!endC) return null;
  let end = onDay(day, endC[0], endC[1], 0);
  if (end <= start) end = new Date(end.getTime() + 24 * 3600_000);
  return { start, end };
}

function clock(raw: string): [number, number] | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function joinParts(parts: Array<string | undefined>): string {
  return parts.map((s) => (s ?? "").trim()).filter(Boolean).join("\n");
}

function programmeLink(activityNo: string, tcUrl: string, enUrl: string): { sourceUrl: string; generic: boolean } {
  for (const raw of [tcUrl, enUrl]) {
    const link = cleanLink(raw);
    if (link) return { sourceUrl: link, generic: false };
  }
  if (activityNo.trim()) {
    return { sourceUrl: `${DETAIL_URL}${encodeURIComponent(activityNo.trim())}&lang=tc`, generic: false };
  }
  return { sourceUrl: LISTING_URL, generic: true };
}
