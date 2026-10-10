import { sha256Base64Url16 } from "./base64";
import { LOCALE_EN, LOCALE_ZH, present, unmarshal } from "./i18n";
import type { Organizer } from "./schemas";

export type Bucket = {
  organizer_key: string;
  organizer_i18n: string;
  source: string;
  attribution_url: string;
  host_display_name: string;
  host_user_id: string;
  upcoming_count: number;
};

export function normalize(s: string): string {
  return s.split(/\s+/).filter(Boolean).join(" ");
}

export function fold(s: string): string {
  return normalize(s).toLowerCase();
}

export function matches(name: string, locales: Record<string, string>, q: string): boolean {
  q = q.toLowerCase().trim();
  if (!q) return true;
  if (name.toLowerCase().includes(q)) return true;
  return Object.values(locales).some((v) => v.toLowerCase().includes(q));
}

export async function aggregate(
  buckets: Bucket[],
  owners: Array<{ source: string; user_id: string }>,
): Promise<Organizer[]> {
  const ownerBySource = new Map<string, string>();
  for (const o of owners) {
    if (o.source && o.user_id) ownerBySource.set(o.source, o.user_id);
  }
  type Acc = {
    key: string;
    zh: Map<string, number>;
    en: Map<string, number>;
    total: number;
    bySource: Map<string, number>;
    hostBySource: Map<string, Map<string, number>>;
    urls: Map<string, number>;
  };
  const grouped = new Map<string, Acc>();
  for (const bucket of buckets) {
    if (bucket.upcoming_count <= 0 || !bucket.organizer_key) continue;
    if (fold(bucket.host_display_name) === bucket.organizer_key) continue;
    let row = grouped.get(bucket.organizer_key);
    if (!row) {
      row = {
        key: bucket.organizer_key,
        zh: new Map(),
        en: new Map(),
        total: 0,
        bySource: new Map(),
        hostBySource: new Map(),
        urls: new Map(),
      };
      grouped.set(bucket.organizer_key, row);
    }
    const { zh, en } = localesOf(bucket.organizer_i18n);
    if (zh) row.zh.set(zh, (row.zh.get(zh) ?? 0) + bucket.upcoming_count);
    if (en) row.en.set(en, (row.en.get(en) ?? 0) + bucket.upcoming_count);
    row.total += bucket.upcoming_count;
    row.bySource.set(bucket.source, (row.bySource.get(bucket.source) ?? 0) + bucket.upcoming_count);
    if (bucket.host_user_id) {
      let hosts = row.hostBySource.get(bucket.source);
      if (!hosts) {
        hosts = new Map();
        row.hostBySource.set(bucket.source, hosts);
      }
      hosts.set(bucket.host_user_id, (hosts.get(bucket.host_user_id) ?? 0) + bucket.upcoming_count);
    }
    if (bucket.attribution_url) {
      row.urls.set(bucket.attribution_url, (row.urls.get(bucket.attribution_url) ?? 0) + bucket.upcoming_count);
    }
  }
  const out: Organizer[] = [];
  for (const row of grouped.values()) {
    if (row.total <= 0) continue;
    const zh = pickMax(row.zh);
    const en = pickMax(row.en);
    const name = zh || en;
    if (!name) continue;
    const locales: Record<string, string> = {};
    if (zh) locales[LOCALE_ZH] = zh;
    if (en) locales[LOCALE_EN] = en;
    const source = pickMax(row.bySource);
    let userID = ownerBySource.get(source) ?? "";
    if (!userID) userID = pickMax(row.hostBySource.get(source) ?? new Map());
    const org: Organizer = {
      key: await sha256Base64Url16(row.key),
      name,
      source,
      upcoming_count: row.total,
    };
    if (Object.keys(locales).length) org.name_i18n = locales;
    if (row.bySource.size > 1) org.sources = rankedKeys(row.bySource);
    if (userID) org.source_user_id = userID;
    const url = pickMax(row.urls);
    if (url) org.attribution_url = url;
    out.push(org);
  }
  return out.sort((a, b) => b.upcoming_count - a.upcoming_count || (a.name < b.name ? -1 : 1));
}

function localesOf(raw: string): { zh: string; en: string } {
  const parsed = unmarshal(raw);
  if (!parsed) return { zh: "", en: "" };
  let zh = normalize(parsed[LOCALE_ZH] ?? "");
  let en = normalize(parsed[LOCALE_EN] ?? "");
  if (!present(zh)) zh = "";
  if (!present(en)) en = "";
  return { zh, en };
}

function pickMax(counts: Map<string, number>): string {
  let best = "";
  let bestN = -1;
  for (const [key, n] of counts) {
    if (!key || n <= 0) continue;
    if (bestN < 0 || n > bestN || (n === bestN && key < best)) {
      best = key;
      bestN = n;
    }
  }
  return best;
}

function rankedKeys(counts: Map<string, number>): string[] {
  return [...counts.entries()]
    .filter(([k, n]) => Boolean(k) && n > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([k]) => k);
}

