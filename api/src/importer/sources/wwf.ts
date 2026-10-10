import { districtFields, text, TYPE_COMMUNITY, type SourceMeta } from "../event";
import type { Fetcher } from "../fetch";
import { emptyEvent, type Batch } from "../types";
import { onDay } from "../sessions";
import { cleanLink, normalizeURL } from "../sourceurl";

const EN_URL = "https://www.wwf.org.hk/en/activities/";
const TC_URL = "https://www.wwf.org.hk/tc/activities/";
const LISTING_URL = "https://www.wwf.org.hk/en/activities/";
const ATTRIBUTION_URL = "http://www.wwf.org.hk";
const PROGRAMME_DAYS = 90;
const ITEM_ID = /item_id=([^&]+)/;

export function meta(): SourceMeta {
  return {
    id: "wwf",
    username: "wwf_hk",
    displayName: "WWF-Hong Kong 世界自然基金會香港分會",
    attribution:
      "文字 © 世界自然基金會香港分會，CC BY-SA 3.0。來源：WWF（http://www.wwf.org.hk）\nText © WWF-Hong Kong, CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/). Source: WWF (http://www.wwf.org.hk)",
    datasetUrl: LISTING_URL,
    listingUrl: LISTING_URL,
  };
}

type Card = { id: string; titleEn: string; titleTc: string; sourceUrl: string; locationEn: string; locationTc: string };

export async function fetchWwf(now: () => Date, fetcher: Fetcher): Promise<Batch> {
  const enPage = await fetcher.get(EN_URL, 4 << 20);
  const tcPage = await fetcher.get(TC_URL, 4 << 20);
  const cards = parsePages(enPage, tcPage);
  if (!cards.length) throw new Error("wwf: no activity cards parsed");
  const m = meta();
  return { events: cards.map((c) => mapCard(now(), c, m)), errors: 0 };
}

export function parsePages(enHtml: Uint8Array, tcHtml: Uint8Array): Card[] {
  const enCards = extractCards(enHtml, false);
  const tcCards = extractCards(tcHtml, true);
  if (!enCards.length && !tcCards.length) return [];
  const byKey = new Map<string, Card>();
  for (const c of enCards) byKey.set(c.id, c);
  for (const c of tcCards) {
    const prev = byKey.get(c.id);
    if (prev) {
      if (!prev.titleTc) prev.titleTc = c.titleTc;
      if (!prev.locationTc) prev.locationTc = c.locationTc;
    } else byKey.set(c.id, c);
  }
  return [...byKey.values()].filter((c) => c.titleEn || c.titleTc);
}

function mapCard(now: Date, card: Card, sourceMeta: SourceMeta) {
  const start = onDay(now, 0, 0, 0);
  const end = new Date(start.getTime() + PROGRAMME_DAYS * 86400_000);
  const title = text(card.titleTc, card.titleEn);
  const loc = text(firstNonEmpty(card.locationTc, card.titleTc), firstNonEmpty(card.locationEn, card.titleEn));
  const found = locate(card);
  let sourceUrl = cleanLink(card.sourceUrl);
  if (!sourceUrl) sourceUrl = LISTING_URL;
  const ev = emptyEvent();
  ev.source = sourceMeta.id;
  ev.externalId = card.id;
  ev.title = title;
  ev.description = { ...title };
  ev.location = loc;
  ev.startAt = start;
  ev.endAt = end;
  ev.type = TYPE_COMMUNITY;
  ev.sourceUrl = sourceUrl;
  ev.sourceUrlGeneric = false;
  ev.latitude = found.lat;
  ev.longitude = found.lng;
  ev.district = found.district;
  ev.districtI18n = found.districtI18n;
  ev.attribution = sourceMeta.attribution;
  ev.attributionUrl = ATTRIBUTION_URL;
  ev.organizer = text("世界自然基金會香港分會", "WWF-Hong Kong");
  ev.dateTbc = true;
  return ev;
}

function extractCards(page: Uint8Array, tc: boolean): Card[] {
  const html = new TextDecoder().decode(page);
  const out: Card[] = [];
  const seen = new Set<string>();
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = decodeHref(/href\s*=\s*["']([^"']+)["']/i.exec(m[1] ?? "")?.[1] ?? "");
    const key = bookingKey(href);
    if (!key) continue;
    if (!programmeBooking(key.booking)) continue;
    const textContent = linkText(m[2] ?? "");
    if (textContent.length < 8) continue;
    if (seen.has(key.id)) continue;
    seen.add(key.id);
    const loc = guessLocation(textContent);
    const c: Card = {
      id: key.id,
      sourceUrl: key.booking,
      locationEn: loc.en,
      locationTc: loc.tc,
      titleEn: tc ? "" : textContent,
      titleTc: tc ? textContent : "",
    };
    out.push(c);
  }
  return out;
}

function decodeHref(s: string): string {
  return s.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

function linkText(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

function programmeBooking(link: string): boolean {
  const l = link.toLowerCase();
  if (l.includes("item_id=")) return true;
  if (l.includes("/w4n")) return true;
  const base = l.split("?")[0] ?? "";
  return base.endsWith("/cf/hhw") || base.endsWith("/cf/ih");
}

function bookingKey(href: string): { id: string; booking: string } | null {
  href = href.trim();
  if (!href) return null;
  const abs = normalizeURL(href);
  let u: URL;
  try {
    u = new URL(abs);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const path = u.pathname.toLowerCase();
  if ((host === "www.wwf.org.hk" || host === "wwf.org.hk") && path.includes("w4n")) {
    return { id: "w4n", booking: abs };
  }
  if (host !== "apps.wwf.org.hk") return null;
  if (abs.includes("item_id=")) {
    const c = ITEM_ID.exec(abs);
    if (c) return { id: `mp-${c[1]!.replaceAll(",", "-")}`, booking: abs };
  }
  if (path.includes("/cf/hhw")) return { id: "hhw", booking: abs.split("?")[0] ?? abs };
  if (path.includes("/cf/ih")) return { id: "ih", booking: abs };
  return null;
}

function locate(card: Card) {
  const sites = [
    ["mai po", "Yuen Long", "元朗", 22.4906, 114.036],
    ["hoi ha", "Tai Po", "大埔", 22.47, 114.334],
    ["island house", "Tai Po", "大埔", 22.4452, 114.1717],
    ["walk for nature", "Yuen Long", "元朗", 22.4906, 114.036],
    ["w4n", "Yuen Long", "元朗", 22.4906, 114.036],
  ] as const;
  const blob = `${card.titleEn} ${card.titleTc} ${card.id}`.toLowerCase();
  for (const [key, den, dtc, lat, lng] of sites) {
    if (blob.includes(key) || card.id.includes(key)) {
      const fields = districtFields(dtc, den);
      return { district: fields.district, districtI18n: fields.districtI18n, lat, lng };
    }
  }
  return { district: "", districtI18n: {}, lat: null as number | null, lng: null as number | null };
}

function guessLocation(title: string): { en: string; tc: string } {
  const lower = title.toLowerCase();
  if (lower.includes("mai po")) return { en: "Mai Po Nature Reserve", tc: "米埔自然保護區" };
  if (lower.includes("hoi ha")) return { en: "Hoi Ha Wan Marine Life Centre", tc: "海下灣海岸公園" };
  if (lower.includes("island house")) return { en: "Island House, Tai Po", tc: "大埔島屋" };
  if (lower.includes("walk for nature")) return { en: "Mai Po Nature Reserve", tc: "米埔自然保護區" };
  return { en: title, tc: title };
}

function firstNonEmpty(...values: string[]): string {
  for (const v of values) {
    const t = v.trim();
    if (t) return t;
  }
  return "";
}
