import { hc } from "hono/client";
import type { AppType } from "api";
import { parseHealthz, type Healthz } from "./schemas";
import { sessionToken } from "../stores/session";

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(body || `request failed ${status}`);
    this.status = status;
    this.body = body;
  }
}

export type ApiClient = ReturnType<typeof hc<AppType>>;

const baseUrl = () => import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export function createApiClient(token = "", fetchImpl: typeof fetch = fetch): ApiClient {
  return hc<AppType>(baseUrl(), {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetchImpl(input, { ...init, headers });
    },
  });
}

export function api(): ApiClient {
  return createApiClient(sessionToken());
}

async function readJson(res: Response): Promise<unknown> {
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }
  return res.json();
}

/** Sample typed query: Hono RPC + Valibot parse of `/healthz`. */
export async function fetchHealth(): Promise<Healthz> {
  return parseHealthz(await readJson(await api().healthz.$get()));
}

export function apiBase(): string {
  return baseUrl();
}
