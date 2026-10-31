import type { QueryClient } from "@tanstack/react-query";
import { G } from "@gopur/shared";
import type { Event } from "@gopur/shared";

function bump(
  event: Event,
  flag: "liked_by_me" | "saved_by_me",
  countKey: "like_count" | "save_count",
  next: boolean,
): Event {
  const was = event[flag] === true;
  if (was === next) return event;
  const count = Math.max(0, (event[countKey] ?? 0) + (next ? 1 : -1));
  return { ...event, [flag]: next, [countKey]: count };
}

export function applyLikeToggle(event: Event, liked: boolean): Event {
  return bump(event, "liked_by_me", "like_count", liked);
}

export function applySaveToggle(event: Event, saved: boolean): Event {
  return bump(event, "saved_by_me", "save_count", saved);
}

export function applyShareBump(event: Event): Event {
  return { ...event, share_count: (event.share_count ?? 0) + 1 };
}

function isEventRow(value: unknown): value is Event {
  return G.isObject(value) && !G.isArray(value) && G.isString((value as { id?: unknown }).id);
}

export function mapEventTree(data: unknown, eventId: string, update: (event: Event) => Event): unknown {
  if (G.isArray(data)) {
    let changed = false;
    const next = data.map((item) => {
      const mapped = mapEventTree(item, eventId, update);
      if (mapped !== item) changed = true;
      return mapped;
    });
    return changed ? next : data;
  }
  if (!G.isObject(data)) return data;
  if (isEventRow(data) && data.id === eventId) return update(data);
  const record = data as Record<string, unknown>;
  let changed = false;
  const next: Record<string, unknown> = { ...record };
  for (const key of Object.keys(record)) {
    const mapped = mapEventTree(record[key], eventId, update);
    if (mapped !== record[key]) {
      next[key] = mapped;
      changed = true;
    }
  }
  return changed ? next : data;
}

export function patchCachedEvents(
  client: QueryClient,
  eventId: string,
  update: (event: Event) => Event,
): void {
  for (const query of client.getQueryCache().getAll()) {
    const data = query.state.data;
    const next = mapEventTree(data, eventId, update);
    if (next !== data) client.setQueryData(query.queryKey, next);
  }
}
