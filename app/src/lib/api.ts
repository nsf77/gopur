import { hc } from "hono/client";
import type { AppType } from "api";
import {
  parseEvent,
  parseEventPage,
  parseHealthz,
  parseLikeState,
  parseOrganizerDirectory,
  parseSaveState,
  parseShareState,
  type Event,
  type EventPage,
  type Healthz,
  type LikeState,
  type OrganizerDirectory,
  type SaveState,
  type ShareState,
} from "./schemas";
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

function compactQuery(query: Record<string, string | undefined>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value) cleaned[key] = value;
  }
  return cleaned;
}

/** Sample typed query: Hono RPC + Valibot parse of `/healthz`. */
export async function fetchHealth(): Promise<Healthz> {
  return parseHealthz(await readJson(await api().healthz.$get()));
}

export async function fetchFeed(cursor?: string): Promise<EventPage> {
  return parseEventPage(await readJson(await api().feed.$get({ query: cursor ? { cursor } : {} })));
}

export async function fetchEvent(id: string): Promise<Event> {
  return parseEvent(await readJson(await api().events[":id"].$get({ param: { id } })));
}

export async function searchEvents(query: Record<string, string | undefined>): Promise<EventPage> {
  return parseEventPage(await readJson(await api().search.events.$get({ query: compactQuery(query) })));
}

export async function fetchOrganizers(q?: string): Promise<OrganizerDirectory> {
  return parseOrganizerDirectory(await readJson(await api().organizers.$get({ query: q ? { q } : {} })));
}

export async function likeEvent(id: string): Promise<LikeState> {
  return parseLikeState(await readJson(await api().events[":id"].like.$post({ param: { id } })));
}

export async function unlikeEvent(id: string): Promise<LikeState> {
  return parseLikeState(await readJson(await api().events[":id"].like.$delete({ param: { id } })));
}

export async function saveEvent(id: string): Promise<SaveState> {
  return parseSaveState(await readJson(await api().events[":id"].save.$post({ param: { id } })));
}

export async function unsaveEvent(id: string): Promise<SaveState> {
  return parseSaveState(await readJson(await api().events[":id"].save.$delete({ param: { id } })));
}

export async function shareEvent(id: string): Promise<ShareState> {
  return parseShareState(await readJson(await api().events[":id"].share.$post({ param: { id } })));
}

export function apiBase(): string {
  return baseUrl();
}
