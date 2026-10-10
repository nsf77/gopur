import { hc } from "hono/client";
import type { AppType } from "api";

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
