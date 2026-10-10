import { districtI18n, hasContent, LOCALE_EN, LOCALE_ZH, present, type LocaleMap } from "../i18n";
import { fold, normalize } from "../organizers";
import { applyInferredPrice } from "./price-tiers";
import { redactContacts } from "./privacy";
import { normalizeSessions } from "./sessions";
import { cleanLink } from "./sourceurl";
import { contentHash } from "./hash";
import {
  emptyEvent,
  TYPE_CLASS,
  TYPE_COMMUNITY,
  TYPE_OFFICIAL,
  TYPE_VOLUNTEER,
  type ImportEvent,
  type SourceMeta,
} from "./types";

export { emptyEvent, TYPE_CLASS, TYPE_COMMUNITY, TYPE_OFFICIAL, TYPE_VOLUNTEER };
export type { ImportEvent, SourceMeta };

export function text(zh: string, en: string): LocaleMap {
  const m: LocaleMap = {};
  zh = zh.trim();
  en = en.trim();
  if (zh) m[LOCALE_ZH] = zh;
  if (en) m[LOCALE_EN] = en;
  return m;
}

export function districtFields(zh: string, en: string): { district: string; districtI18n: LocaleMap } {
  let m = text(zh, en);
  if (Object.keys(m).length === 0) return { district: "", districtI18n: m };
  let legacy = m[LOCALE_ZH] ?? "";
  if (!legacy) legacy = m[LOCALE_EN] ?? "";
  if (Object.keys(m).length === 1) {
    const extra = districtI18n(legacy);
    if (Object.keys(extra).length > 1) {
      for (const [k, v] of Object.entries(extra)) {
        if (m[k] == null) m[k] = v;
      }
    }
  }
  return { district: legacy, districtI18n: m };
}

function redactMap(m: LocaleMap): LocaleMap {
  const out: LocaleMap = {};
  for (const [k, v] of Object.entries(m)) {
    const red = redactContacts(v);
    if (red) out[k] = red;
  }
  return out;
}

function cleanOrganizer(m: LocaleMap): LocaleMap {
  if (Object.keys(m).length === 0) return {};
  const redacted = redactMap(m);
  const out: LocaleMap = {};
  for (const locale of [LOCALE_ZH, LOCALE_EN]) {
    const v = redacted[locale];
    if (!v) continue;
    const value = normalize(v);
    if (present(value)) out[locale] = value;
  }
  return out;
}

function hasTitle(m: LocaleMap): boolean {
  return Object.values(m).some((v) => v.trim() !== "");
}

export async function prepareEvent(event: ImportEvent): Promise<ImportEvent> {
  event.title = redactMap(event.title);
  event.description = redactMap(event.description);
  event.location = redactMap(event.location);
  event.district = redactContacts(event.district.trim());
  if (Object.keys(event.districtI18n).length > 0) {
    event.districtI18n = redactMap(event.districtI18n);
  } else if (event.district) {
    event.districtI18n = districtI18n(event.district);
  }
  if (!event.district && Object.keys(event.districtI18n).length > 0) {
    event.district = event.districtI18n[LOCALE_ZH] ?? "";
    if (!event.district) event.district = event.districtI18n[LOCALE_EN] ?? "";
  }
  event.attribution = redactContacts(event.attribution.trim());
  event.organizer = cleanOrganizer(event.organizer);
  event.sourceUrl = cleanLink(event.sourceUrl);
  if (!event.sourceUrl) event.sourceUrlGeneric = true;
  event.externalId = event.externalId.trim();
  event.source = event.source.trim();
  if (!event.source || !event.externalId) throw new Error("missing source id");
  if (!hasTitle(event.title)) throw new Error("missing title");
  const norm = normalizeSessions(event.sessions, event.startAt, event.endAt);
  if (norm.sessions.length === 0) throw new Error("invalid start or end");
  event.sessions = norm.sessions;
  event.startAt = norm.start;
  event.endAt = norm.end;
  switch (event.type) {
    case TYPE_VOLUNTEER:
    case TYPE_COMMUNITY:
    case TYPE_CLASS:
    case TYPE_OFFICIAL:
      break;
    default:
      throw new Error("invalid event type");
  }
  applyInferredPrice(event);
  event.hash = await contentHash(event);
  return event;
}

export async function prepare(meta: SourceMeta, event: ImportEvent): Promise<ImportEvent | null> {
  if (!event.source) event.source = meta.id;
  if (!event.attribution) event.attribution = meta.attribution;
  try {
    const prepared = await prepareEvent(event);
    if (!prepared.sourceUrl) {
      prepared.sourceUrl = cleanLink(meta.listingUrl);
      prepared.sourceUrlGeneric = true;
      prepared.hash = await contentHash(prepared);
    }
    return prepared;
  } catch {
    return null;
  }
}

export async function prepareEvents(meta: SourceMeta, events: ImportEvent[]): Promise<{ events: ImportEvent[]; skipped: number }> {
  let skipped = 0;
  const seen = new Map<string, number>();
  const out: ImportEvent[] = [];
  for (const event of events) {
    const prepared = await prepare(meta, event);
    if (!prepared) {
      skipped++;
      continue;
    }
    const idx = seen.get(prepared.externalId);
    if (idx != null) {
      out[idx] = prepared;
      continue;
    }
    seen.set(prepared.externalId, out.length);
    out.push(prepared);
  }
  return { events: out, skipped };
}

export { hasContent, fold };
