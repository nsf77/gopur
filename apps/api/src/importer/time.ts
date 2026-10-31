export const HKT_OFFSET_MS = 8 * 3600_000;

export function rfc3339Utc(d: Date): string {
  if (!d || Number.isNaN(d.getTime()) || d.getTime() === 0) {
    return "0001-01-01T00:00:00Z";
  }
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function stampNanos(d: Date): string {
  const iso = d.toISOString();
  const ms = iso.slice(20, 23);
  return iso.replace(/\.\d{3}Z$/, `.${ms}000000Z`);
}

export function parseRFC3339(raw: string): Date | null {
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

export function hktYMD(d: Date): { y: number; m: number; day: number } {
  const shifted = new Date(d.getTime() + HKT_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

export function onDay(day: Date, hour: number, min: number, sec: number): Date {
  const { y, m, day: d } = hktYMD(day);
  return new Date(Date.UTC(y, m - 1, d, hour, min, sec) - HKT_OFFSET_MS);
}

export function hktDate(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): Date | null {
  const utc = Date.UTC(y, mo - 1, d, h, mi, s) - HKT_OFFSET_MS;
  const out = new Date(utc);
  const check = hktYMD(out);
  if (check.y !== y || check.m !== mo || check.day !== d) return null;
  return out;
}

export function formatCoord(v: number | null | undefined): string {
  if (v == null) return "";
  return v.toFixed(6);
}
