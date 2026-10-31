import { LOCALE_EN, LOCALE_ZH } from "../i18n";
import { parsePrices } from "./priceparse";
import type { ImportEvent, PriceTier } from "./types";

export function marshalPriceTiers(tiers: PriceTier[]): string {
  if (!tiers.length) return "[]";
  return JSON.stringify(tiers.map((t) => ({ cents: t.cents, label: t.label ?? null })));
}

export function applyInferredPrice(event: ImportEvent): void {
  if (event.priceCents != null) {
    if (event.priceCents === 0) {
      event.priceTiers = [];
      event.priceMaxCents = null;
    }
    return;
  }
  let combined = "";
  for (const locale of [LOCALE_ZH, LOCALE_EN]) {
    const t = (event.description[locale] ?? "").trim();
    if (t) combined += t + "\n";
  }
  const parsed = parsePrices(combined);
  if (!parsed) return;
  if (parsed.free) {
    event.priceCents = 0;
    event.priceMaxCents = null;
    event.priceTiers = [];
    return;
  }
  event.priceCents = parsed.minCents;
  if (parsed.maxCents > parsed.minCents) event.priceMaxCents = parsed.maxCents;
  event.priceTiers = parsed.tiers.map((t) => ({ cents: t.cents, label: t.label ?? null }));
}
