export const JOIN_APPROVAL = "approval";
export const JOIN_INSTANT = "instant";

export function validType(eventType: string): boolean {
  return eventType === "volunteer" || eventType === "community" || eventType === "class" || eventType === "official";
}

export function validateSchedule(start: string, end: string): string | null {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  if (e < s) return "end_at must not be before start_at";
  return null;
}

export function normalizeJoinMode(raw: string): { value: string } | { error: string } {
  const v = raw.trim();
  if (!v) return { value: JOIN_APPROVAL };
  if (v !== JOIN_INSTANT && v !== JOIN_APPROVAL) return { error: "join_mode must be instant or approval" };
  return { value: v };
}

export function normalizeCapacity(capacity: number | null | undefined): { value: number | null } | { error: string } {
  if (capacity == null) return { value: null };
  if (capacity < 1 || capacity > 100_000) return { error: "capacity must be at least 1" };
  return { value: capacity };
}

export function normalizeAgeMode(raw: string): { value: string } | { error: string } {
  const v = raw.trim();
  if (!v) return { value: "suggested" };
  if (v !== "strict" && v !== "suggested") return { error: "age_mode must be strict or suggested" };
  return { value: v };
}

export function normalizeAge(
  min: number | null | undefined,
  max: number | null | undefined,
  mode: string,
): { min: number | null; max: number | null; mode: string } | { error: string } {
  const m = normalizeAgeMode(mode);
  if ("error" in m) return m;
  if (min != null && (min < 0 || min > 120)) return { error: "invalid age range" };
  if (max != null && (max < 0 || max > 120)) return { error: "invalid age range" };
  if (min != null && max != null && min > max) return { error: "invalid age range" };
  return { min: min ?? null, max: max ?? null, mode: m.value };
}

export function normalizeCoords(
  lat: number | undefined | null,
  lng: number | undefined | null,
): { value: [number, number] | null } | { error: string } {
  if (lat == null && lng == null) return { value: null };
  if (lat == null || lng == null) return { error: "latitude and longitude must both be set" };
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { error: "invalid coordinates" };
  return { value: [lat, lng] };
}

export function normalizeDistrict(raw: string): { value: string } | { error: string } {
  const district = raw.trim();
  if (!district) return { value: "" };
  if (district.includes("\r") || district.includes("\n") || [...district].length > 80) {
    return { error: "invalid district" };
  }
  return { value: district };
}
