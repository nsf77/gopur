function parseGoDuration(raw: string): number | null {
  raw = raw.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw) * 1000;
  if (raw.endsWith("ms")) {
    const n = Number(raw.slice(0, -2));
    return Number.isFinite(n) ? n : null;
  }
  const unit = raw.slice(-1);
  const num = Number(raw.slice(0, -1));
  if (!Number.isFinite(num)) return null;
  if (unit === "s") return num * 1000;
  if (unit === "m") return num * 60_000;
  if (unit === "h") return num * 3600_000;
  return null;
}

function envDuration(raw: string | undefined, fallbackMs: number): number {
  const value = (raw ?? "").trim();
  if (!value) return fallbackMs;
  const d = parseGoDuration(value);
  if (d == null || d === 0) return fallbackMs;
  return d;
}

export function runTimeoutMs(raw?: string): number {
  return envDuration(raw, 90 * 60_000);
}

export function sourceTimeoutMs(raw?: string): number {
  return envDuration(raw, 15 * 60_000);
}
