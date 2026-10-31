const MAX_HKD = 100_000;

export type PriceTierParsed = { cents: number; label?: string | null };
export type PriceResult = { minCents: number; maxCents: number; tiers: PriceTierParsed[]; free: boolean };

const dateDMY = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g;
const dateYMD = /\b\d{4}-\d{2}-\d{2}\b/g;
const yearZh = /\d{4}年(?:度)?/g;
const clock = /\b\d{1,2}:\d{2}\b/g;
const phone = /(?:\+?\s*852[\s\-]*)?(?:\(?\d{4}\)?[\s\-]\d{4})/g;
const yearAlone = /\b(19|20)\d{2}\b/g;
const freePattern = /(免費|免费|free(\s+admission)?|free\s+activities?)/i;
const rangePat =
  /(?:HK\$|\$)\s*(\d{1,6})(?:\.\d{1,2})?\s*[-–至/]\s*(?:HK\$|\$)?\s*(\d{1,6})(?:\.\d{1,2})?/gi;
const labelPat =
  /(成人|小童|兒童|學生|長者|正價|優惠|一般|Adult|Child|Student|Senior)\s*(?:HK\$|\$|港幣)?\s*(\d{1,6})(?:\.\d{1,2})?/gi;
const dollarPat = /(?:HK\$|\$)(\d{1,6})(?:\.\d{1,2})?/gi;
const hkdYuanPat = /港幣\s*(\d{1,6})(?:\.\d{1,2})?\s*元?/g;
const yuanPat = /(\d{1,6})(?:\.\d{1,2})?\s*元/g;

export function parsePrices(text: string): PriceResult | null {
  text = text.trim();
  if (!text) return null;
  const scrubbed = maskNoise(text);
  let tiers = collectTiers(scrubbed);
  if (tiers.length === 0) {
    if (freePattern.test(text)) return { minCents: 0, maxCents: 0, tiers: [], free: true };
    return null;
  }
  tiers.sort((a, b) => a.cents - b.cents);
  tiers = dedupeTiers(tiers);
  return {
    minCents: tiers[0]!.cents,
    maxCents: tiers[tiers.length - 1]!.cents,
    tiers,
    free: false,
  };
}

function maskNoise(s: string): string {
  return s
    .replace(dateDMY, " ")
    .replace(dateYMD, " ")
    .replace(yearZh, " ")
    .replace(clock, " ")
    .replace(phone, " ")
    .replace(yearAlone, " ");
}

function collectTiers(s: string): PriceTierParsed[] {
  const tiers: PriceTierParsed[] = [];
  for (const m of s.matchAll(rangePat)) {
    const a = hkdAmount(m[1] ?? "");
    const b = hkdAmount(m[2] ?? "");
    if (a != null) tiers.push({ cents: a });
    if (b != null) tiers.push({ cents: b });
  }
  s = s.replace(rangePat, " ");
  const labeled = new Map<number, string>();
  for (const m of s.matchAll(labelPat)) {
    const label = (m[1] ?? "").trim();
    const cents = hkdAmount(m[2] ?? "");
    if (cents == null) continue;
    if (!labeled.has(cents)) labeled.set(cents, label);
  }
  s = s.replace(labelPat, " ");
  for (const [cents, label] of labeled) tiers.push({ cents, label });
  for (const m of s.matchAll(dollarPat)) {
    const c = hkdAmount(m[1] ?? "");
    if (c != null) tiers.push({ cents: c });
  }
  for (const m of s.matchAll(hkdYuanPat)) {
    const c = hkdAmount(m[1] ?? "");
    if (c != null) tiers.push({ cents: c });
  }
  for (const m of s.matchAll(yuanPat)) {
    const c = hkdAmount(m[1] ?? "");
    if (c != null) tiers.push({ cents: c });
  }
  return tiers;
}

function hkdAmount(digits: string): number | null {
  digits = digits.trim();
  if (!digits) return null;
  let n = 0;
  for (const ch of digits) {
    if (ch < "0" || ch > "9") return null;
    n = n * 10 + (ch.charCodeAt(0) - 48);
    if (n > MAX_HKD) return null;
  }
  if (n === 0) return null;
  return n * 100;
}

function dedupeTiers(inTiers: PriceTierParsed[]): PriceTierParsed[] {
  const map = new Map<number, PriceTierParsed>();
  const order: number[] = [];
  for (const t of inTiers) {
    order.push(t.cents);
    const have = map.get(t.cents);
    if (!have) map.set(t.cents, t);
    else if (!have.label && t.label) map.set(t.cents, t);
  }
  const out: PriceTierParsed[] = [];
  for (const c of order) {
    const t = map.get(c);
    if (t) {
      out.push(t);
      map.delete(c);
    }
  }
  out.sort((a, b) => a.cents - b.cents);
  return out;
}
