import { sha256Hex } from "./sha";
import { storedSessions } from "./sessions";
import { formatCoord, rfc3339Utc } from "./time";
import type { ImportEvent } from "./types";

type LocaleMapLike = Record<string, string>;

function copyMap(m: LocaleMapLike): Record<string, string> {
  const keys = Object.keys(m).sort();
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = m[k] ?? "";
    if (v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

function goEscape(raw: string): string {
  return raw.replace(/[<>&\u2028\u2029]/g, (ch) => {
    if (ch === "<") return "\\u003c";
    if (ch === ">") return "\\u003e";
    if (ch === "&") return "\\u0026";
    if (ch === "\u2028") return "\\u2028";
    return "\\u2029";
  });
}

function encode(value: unknown): string {
  return goEscape(JSON.stringify(value));
}

export async function contentHash(event: ImportEvent): Promise<string> {
  const sessions = storedSessions(event).map((s) => ({
    start: rfc3339Utc(s.start),
    end: rfc3339Utc(s.end),
  }));
  const doc = {
    title: copyMap(event.title),
    description: copyMap(event.description),
    location: copyMap(event.location),
    start: rfc3339Utc(event.startAt),
    end: rfc3339Utc(event.endAt),
    type: event.type,
    price: event.priceCents,
    price_max: event.priceMaxCents,
    price_tiers: event.priceTiers.map((t) => ({ cents: t.cents, label: t.label ?? null })),
    source_url: event.sourceUrl,
    source_url_generic: event.sourceUrlGeneric,
    district: event.district,
    district_i18n: copyMap(event.districtI18n),
    lat: formatCoord(event.latitude),
    lng: formatCoord(event.longitude),
    attribution: event.attribution,
    attribution_url: event.attributionUrl,
    organizer: copyMap(event.organizer),
    date_tbc: event.dateTbc,
    source_url_override: event.sourceUrlOverride.trim(),
    sessions,
  };
  const raw = encode(doc);
  return sha256Hex(raw);
}
