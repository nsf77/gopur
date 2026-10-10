import { xmlBlocks, xmlChild } from "../xml";

export type Venue = { code: string; zh: string; en: string; lat: number | null; lng: number | null };
export type Catalog = { byCode: Map<string, Venue>; byName: Map<string, Venue> };

let globalCat: Catalog | null = null;

export function resetGlobal(): void {
  globalCat = null;
}

function parseCoord(raw: string): number | null {
  raw = raw.trim();
  if (!raw) return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v === 0) return null;
  return v;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split("")
    .filter((c) => ![" ", "　", "-", "–", "—", "(", ")", ".", ","].includes(c))
    .join("");
}

export function parseCatalog(venuesXml: Uint8Array): Catalog {
  const text = new TextDecoder().decode(venuesXml).trim();
  const byCode = new Map<string, Venue>();
  const byName = new Map<string, Venue>();
  if (!text) return { byCode, byName };
  for (const item of xmlBlocks(text, "venue")) {
    const v: Venue = {
      code: (item.attrs.id ?? "").trim(),
      zh: xmlChild(item.inner, "venuec"),
      en: xmlChild(item.inner, "venuee"),
      lat: parseCoord(xmlChild(item.inner, "latitude")),
      lng: parseCoord(xmlChild(item.inner, "longitude")),
    };
    if (v.code) byCode.set(v.code.toUpperCase(), v);
    for (const name of [v.zh, v.en]) {
      const key = normalizeName(name);
      if (key) byName.set(key, v);
    }
  }
  return { byCode, byName };
}

export function globalCatalog(venuesXml: Uint8Array): Catalog {
  if (globalCat) return globalCat;
  globalCat = parseCatalog(venuesXml);
  return globalCat;
}

export function regionDistrict(regionZh: string, regionEn: string): string {
  const zh = regionZh.trim();
  if (zh && zh !== "不適用") return zh;
  return regionEn.trim();
}

function firstNonEmpty(a: string, b: string): string {
  a = a.trim();
  return a || b.trim();
}

export function resolveVenue(
  cat: Catalog,
  code: string,
  nameZh: string,
  nameEn: string,
  regionZh: string,
  regionEn: string,
): { name: string; lat: number | null; lng: number | null } {
  const c = cat.byCode.get(code.trim().toUpperCase());
  if (c) return { name: firstNonEmpty(c.zh, c.en), lat: c.lat, lng: c.lng };
  for (const name of [nameZh, nameEn]) {
    const v = cat.byName.get(normalizeName(name));
    if (v) return { name: firstNonEmpty(v.zh, v.en), lat: v.lat, lng: v.lng };
  }
  return { name: regionDistrict(regionZh, regionEn), lat: null, lng: null };
}
