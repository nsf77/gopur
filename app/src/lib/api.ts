import { hc } from "hono/client";
import type { AppType, Event, EventPage } from "api";
import { A, O, pipe } from "@mobily/ts-belt";

export type ApiClient = ReturnType<typeof hc<AppType>>;

export function createApiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): ApiClient {
  return hc<AppType>(baseUrl, { fetch: fetchImpl });
}

export const api = createApiClient(
  import.meta.env.VITE_API_URL ?? "http://localhost:8787",
);

export async function fetchHealth(client: ApiClient = api) {
  const res = await client.healthz.$get();
  if (!res.ok) {
    throw new Error(`healthz ${res.status}`);
  }
  return res.json();
}

export async function fetchFeed(client: ApiClient = api) {
  const res = await client.feed.$get({ query: {} });
  if (!res.ok) {
    throw new Error(`feed ${res.status}`);
  }
  return res.json() as Promise<EventPage>;
}

export function feedTitles(events: Event[]): readonly string[] {
  return pipe(
    events,
    A.filterMap((ev) => O.fromFalsy(ev.title)),
  );
}
