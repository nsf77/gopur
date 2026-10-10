import { hc } from "hono/client";
import type { AppType, Event, EventPage } from "api";
import { A, O, pipe } from "@mobily/ts-belt";

export type ApiClient = ReturnType<typeof hc<AppType>>;

export function createApiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
  token = "",
): ApiClient {
  return hc<AppType>(baseUrl, {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetchImpl(input, { ...init, headers });
    },
  });
}

export const api = createApiClient(import.meta.env.VITE_API_URL ?? "http://localhost:8787");

export function clientWithToken(token: string): ApiClient {
  return createApiClient(import.meta.env.VITE_API_URL ?? "http://localhost:8787", fetch, token);
}

export async function fetchHealth(client: ApiClient = api) {
  const res = await client.healthz.$get();
  if (!res.ok) throw new Error(`healthz ${res.status}`);
  return res.json();
}

export async function fetchFeed(client: ApiClient = api) {
  const res = await client.feed.$get({ query: {} });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  return res.json() as Promise<EventPage>;
}

export async function likeEvent(eventId: string, token: string) {
  const res = await clientWithToken(token).events[":id"].like.$post({ param: { id: eventId } });
  if (!res.ok) throw new Error(`like ${res.status}`);
  return res.json();
}

export async function unlikeEvent(eventId: string, token: string) {
  const res = await clientWithToken(token).events[":id"].like.$delete({ param: { id: eventId } });
  if (!res.ok) throw new Error(`unlike ${res.status}`);
  return res.json();
}

export async function saveEvent(eventId: string, token: string) {
  const res = await clientWithToken(token).events[":id"].save.$post({ param: { id: eventId } });
  if (!res.ok) throw new Error(`save ${res.status}`);
  return res.json();
}

export async function unsaveEvent(eventId: string, token: string) {
  const res = await clientWithToken(token).events[":id"].save.$delete({ param: { id: eventId } });
  if (!res.ok) throw new Error(`unsave ${res.status}`);
  return res.json();
}

export function feedTitles(events: Event[]): readonly string[] {
  return pipe(events, A.filterMap((ev) => O.fromFalsy(ev.title)));
}

export function firstEvent(events: Event[]): Event | null {
  return pipe(events, A.head, O.toNullable);
}
