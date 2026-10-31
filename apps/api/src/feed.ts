import { O, pipe } from "@mobily/ts-belt";
import { decodeBase64Url, encodeBase64Url } from "./base64";
import { kindWeight, sourceWeight, type FeedConfig } from "./feed-config";

export type Factors = {
  hasDistance: boolean;
  distanceKm: number;
  daysUntilStart: number;
  spanDays: number;
  followsHost: boolean;
  popularitySignals: number;
  age: number;
  ageMin?: number | null;
  ageMax?: number | null;
  interestShare: number;
  source: string;
  dateTbc: boolean;
};

export function score(cfg: FeedConfig, f: Factors): number {
  const base =
    distanceComponent(cfg, f) +
    cfg.weights.interest * clamp01(f.interestShare) +
    soonnessComponent(cfg, f) +
    (f.followsHost ? cfg.weights.followed_org : 0) +
    popularityComponent(cfg, f) +
    ageComponent(cfg, f);
  let mult = sourceWeight(cfg, f.source);
  if (f.spanDays > cfg.long_span.threshold_days) mult *= cfg.long_span.multiplier;
  if (base < 0 || mult < 0) return 0;
  return base * mult;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function distanceComponent(cfg: FeedConfig, f: Factors): number {
  if (!f.hasDistance) return 0;
  const km = Math.max(0, f.distanceKm);
  const { full_km: full, zero_km: zero } = cfg.distance;
  const weight = cfg.weights.distance;
  if (km <= full) return weight;
  if (km >= zero) return 0;
  return (weight * (zero - km)) / (zero - full);
}

function soonnessComponent(cfg: FeedConfig, f: Factors): number {
  if (f.dateTbc) return cfg.weights.soonness * 0.35;
  const days = Math.max(0, f.daysUntilStart);
  const full = cfg.soonness.full_within_days;
  const zero = cfg.soonness.zero_after_days;
  const weight = cfg.weights.soonness;
  if (days <= full) return weight;
  if (days >= zero) return 0;
  return (weight * (zero - days)) / (zero - full);
}

function popularityComponent(cfg: FeedConfig, f: Factors): number {
  if (f.popularitySignals <= 0) return 0;
  const ratio = Math.min(1, f.popularitySignals / cfg.popularity_full_at);
  return cfg.weights.popularity * ratio;
}

function ageComponent(cfg: FeedConfig, f: Factors): number {
  const weight = cfg.weights.age_fit;
  if (f.ageMin == null && f.ageMax == null) return weight;
  let gap = 0;
  if (f.ageMin != null && f.age < f.ageMin) gap = f.ageMin - f.age;
  else if (f.ageMax != null && f.age > f.ageMax) gap = f.age - f.ageMax;
  if (gap === 0) return weight;
  if (gap >= cfg.age_gap_zero_years) return 0;
  return weight * (1 - gap / cfg.age_gap_zero_years);
}

export function distanceKM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earth = 6371;
  const r1 = (lat1 * Math.PI) / 180;
  const r2 = (lat2 * Math.PI) / 180;
  const dlat = ((lat2 - lat1) * Math.PI) / 180;
  const dlng = ((lng2 - lng1) * Math.PI) / 180;
  let a =
    Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(r1) * Math.cos(r2) * Math.sin(dlng / 2) * Math.sin(dlng / 2);
  if (a > 1) a = 1;
  return 2 * earth * Math.asin(Math.sqrt(a));
}

export type FeedItem = {
  id: string;
  hostId: string;
  type: string;
  score: number;
  startAt: string;
};

export function arrange(items: FeedItem[], maxSameOrganizer: number, maxSameCategory: number): FeedItem[] {
  const maxOrg = Math.max(1, maxSameOrganizer);
  const maxCat = Math.max(1, maxSameCategory);
  const sorted = [...items].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.startAt !== b.startAt) return a.startAt < b.startAt ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
  const out: FeedItem[] = [];
  const deferred: FeedItem[] = [];
  let head = 0;
  for (const item of sorted) {
    while (head < deferred.length) {
      const waiting = deferred[head];
      if (!waiting || breaks(out, waiting, maxOrg, maxCat)) break;
      out.push(waiting);
      head++;
    }
    if (!breaks(out, item, maxOrg, maxCat)) {
      out.push(item);
      continue;
    }
    deferred.push(item);
  }
  let rest = deferred.slice(head);
  while (rest.length > 0) {
    const idx = rest.findIndex((candidate) => !breaks(out, candidate, maxOrg, maxCat));
    if (idx < 0) {
      out.push(...rest);
      break;
    }
    const pick = rest[idx];
    if (pick) out.push(pick);
    rest = rest.filter((_, i) => i !== idx);
  }
  return out;
}

function breaks(out: FeedItem[], next: FeedItem, maxOrg: number, maxCat: number): boolean {
  return streak(out, next, maxOrg, organizerKey) || streak(out, next, maxCat, (i) => i.type);
}

function organizerKey(item: FeedItem): string {
  return item.hostId || `event:${item.id}`;
}

function streak(out: FeedItem[], next: FeedItem, max: number, key: (i: FeedItem) => string): boolean {
  if (max < 1 || out.length < max) return false;
  const want = key(next);
  for (let i = 1; i <= max; i++) {
    const prev = out[out.length - i];
    if (!prev || key(prev) !== want) return false;
  }
  return true;
}

export function encodeCursor(offset: number): string {
  if (offset < 0) offset = 0;
  return encodeBase64Url(String(offset));
}

export function decodeCursor(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("invalid cursor");
  let decoded: string;
  try {
    decoded = decodeBase64Url(trimmed);
  } catch {
    throw new Error("invalid cursor");
  }
  const n = Number(decoded);
  if (!Number.isInteger(n) || n < 0) throw new Error("invalid cursor");
  return n;
}

export type Signal = { eventId: string; eventType: string; kind: string; at: Date };

export function buildProfile(cfg: FeedConfig, signals: Signal[], now: Date): { share: (t: string) => number } {
  const latestView = new Map<string, Signal>();
  const kept: Signal[] = [];
  for (const s of signals) {
    if (s.kind === "view") {
      const prev = latestView.get(s.eventId);
      if (!prev || s.at > prev.at) latestView.set(s.eventId, s);
      continue;
    }
    kept.push(s);
  }
  kept.push(...latestView.values());
  const weights = new Map<string, number>();
  let total = 0;
  for (const s of kept) {
    const base = kindWeight(cfg, s.kind);
    if (base <= 0 || !s.eventType) continue;
    const w = decay(base, s.at, now, cfg.interest.half_life_days);
    weights.set(s.eventType, (weights.get(s.eventType) ?? 0) + w);
    total += w;
  }
  return {
    share: (eventType: string) => (total <= 0 ? 0 : (weights.get(eventType) ?? 0) / total),
  };
}

function decay(weight: number, at: Date, now: Date, halfLifeDays: number): number {
  if (!weight || halfLifeDays <= 0) return weight;
  let days = (now.getTime() - at.getTime()) / 86400000;
  if (days < 0) days = 0;
  return weight * Math.exp((-Math.LN2 * days) / halfLifeDays);
}

export function parseTime(value: string): Date | null {
  return pipe(
    O.fromFalsy(value.trim()),
    O.flatMap((v) => {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return O.Some(d);
      const sqlite = Date.parse(`${v.replace(" ", "T")}Z`);
      return Number.isNaN(sqlite) ? O.None : O.Some(new Date(sqlite));
    }),
    O.toNullable,
  );
}

export function pageWindow(query: { limit?: string; cursor?: string; offset?: string }): {
  limit: number;
  offset: number;
} {
  let limit = 20;
  if (query.limit) {
    const n = Number(query.limit);
    if (!Number.isInteger(n) || n <= 0) throw new Error("invalid limit");
    limit = n;
  }
  if (limit > 50) limit = 50;
  if (query.cursor) return { limit, offset: decodeCursor(query.cursor) };
  if (query.offset) {
    const n = Number(query.offset);
    if (!Number.isInteger(n) || n < 0) throw new Error("invalid offset");
    return { limit, offset: n };
  }
  return { limit, offset: 0 };
}

export function feedEligible(g: {
  hidden: boolean;
  cancelled: boolean;
  status: string;
  end: Date | null;
  now: Date;
  capacity: number | null;
  going: number;
  blocked: boolean;
  hostPrivate: boolean;
  viewerIsHost: boolean;
  viewerFollowsHost: boolean;
  ageMin: number | null;
  ageMax: number | null;
  ageMode: string;
  audience: { authenticated: boolean; age: number; ageKnown: boolean; isTeen: boolean };
}): boolean {
  if (g.hidden || g.cancelled) return false;
  if (g.status === "hidden" || g.status === "past" || g.status === "cancelled") return false;
  if (g.end && g.end.getTime() <= g.now.getTime()) return false;
  if (g.capacity != null && g.going >= g.capacity) return false;
  if (g.blocked) return false;
  if (g.hostPrivate && !g.viewerIsHost && !g.viewerFollowsHost) return false;
  return ageVisible(g.ageMin, g.ageMax, g.ageMode, g.audience);
}

export function ageVisible(
  min: number | null,
  max: number | null,
  mode: string,
  audience: { authenticated: boolean; age: number; ageKnown: boolean; isTeen: boolean },
): boolean {
  if (!mode) mode = "suggested";
  if (audience.isTeen) {
    if (min == null && max == null) return false;
    return inRange(audience.age, min, max);
  }
  if (mode === "strict" && (min != null || max != null)) {
    if (!audience.authenticated) return false;
    const age = audience.ageKnown ? audience.age : 18;
    return inRange(age, min, max);
  }
  return true;
}

function inRange(age: number, min: number | null, max: number | null): boolean {
  if (min != null && age < min) return false;
  if (max != null && age > max) return false;
  return true;
}
