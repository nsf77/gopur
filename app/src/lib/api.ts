import { hc } from "hono/client";
import type { AppType } from "api";
import {
  parseAuthResponse,
  parseErrorBody,
  parseEvent,
  parseEventPage,
  parseHealthz,
  parseLikeState,
  parseMessageResponse,
  parseOrganizerDirectory,
  parseSaveState,
  parseShareState,
  parseUser,
  type AuthResponse,
  type ErrorBody,
  type Event,
  type EventPage,
  type Healthz,
  type LikeState,
  type OrganizerDirectory,
  type SaveState,
  type ShareState,
  type User,
} from "./schemas";
import { sessionToken, useSessionStore } from "../stores/session";

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly payload: ErrorBody | null;

  constructor(status: number, body: string) {
    super(body || `request failed ${status}`);
    this.status = status;
    this.body = body;
    this.payload = parseJsonError(body);
  }
}

function parseJsonError(body: string): ErrorBody | null {
  try {
    return parseErrorBody(JSON.parse(body) as unknown);
  } catch {
    return null;
  }
}

export type ApiClient = ReturnType<typeof hc<AppType>>;

const baseUrl = () => import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export function createApiClient(token = "", fetchImpl: typeof fetch = fetch): ApiClient {
  return hc<AppType>(baseUrl(), {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetchImpl(input, { ...init, headers }).then((res) => {
        if (token && res.status === 401) useSessionStore.getState().signOut();
        return res;
      });
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

export async function startEmailOtp(email: string): Promise<void> {
  parseMessageResponse(await readJson(await api().auth.email.start.$post({ json: { email } })));
}

export async function verifyEmailOtp(email: string, code: string, birthdate?: string): Promise<AuthResponse> {
  return parseAuthResponse(
    await readJson(
      await api().auth.email.verify.$post({
        json: birthdate ? { email, code, birthdate } : { email, code },
      }),
    ),
  );
}

export async function fetchMe(): Promise<User> {
  return parseUser(await readJson(await api().me.$get()));
}

export function apiBase(): string {
  return baseUrl();
}
