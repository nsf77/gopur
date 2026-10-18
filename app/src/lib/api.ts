import { hc } from "hono/client";
import type { AppType } from "api";
import {
  parseAuthResponse,
  parseErrorBody,
  parseEvent,
  parseEventList,
  parseEventPage,
  parseHealthz,
  parseLikeState,
  parseMessageResponse,
  parseMyEventList,
  parseNotification,
  parseNotificationList,
  parseOrganizerDirectory,
  parseSaveState,
  parseShareState,
  parseUnreadAfterReadAll,
  parseUnreadCount,
  parseUser,
  type AuthResponse,
  type ErrorBody,
  type Event,
  type EventList,
  type EventPage,
  type Healthz,
  type LikeState,
  type MyEventList,
  type Notification,
  type NotificationList,
  type OrganizerDirectory,
  type SaveState,
  type ShareState,
  type UnreadAfterReadAll,
  type UnreadCount,
  type User,
} from "./schemas";
import type { EventWriteBody } from "./event-draft";
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

function baseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return `${window.location.origin}/api`;
  return "/api";
}

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

export async function patchMe(body: Record<string, string | boolean>): Promise<User> {
  return parseUser(await readJson(await api().me.$patch({ json: body })));
}

export async function fetchMyEvents(when: "upcoming" | "past"): Promise<MyEventList> {
  return parseMyEventList(await readJson(await api().me.events.$get({ query: { when } })));
}

export async function fetchSavedEvents(): Promise<EventList> {
  return parseEventList(await readJson(await api().me.saved.$get()));
}

export async function fetchLikedEvents(): Promise<EventList> {
  return parseEventList(await readJson(await api().me.likes.$get()));
}

export async function createEvent(body: EventWriteBody): Promise<Event> {
  return parseEvent(await readJson(await api().events.$post({ json: body })));
}

export async function updateEvent(id: string, body: EventWriteBody): Promise<Event> {
  return parseEvent(await readJson(await api().events[":id"].$patch({ param: { id }, json: body })));
}

export async function fetchNotifications(cursor?: string): Promise<NotificationList> {
  return parseNotificationList(
    await readJson(await api().notifications.$get({ query: cursor ? { cursor } : {} })),
  );
}

export async function fetchUnreadCount(): Promise<UnreadCount> {
  return parseUnreadCount(await readJson(await api().notifications["unread-count"].$get()));
}

export async function markAllNotificationsRead(): Promise<UnreadAfterReadAll> {
  return parseUnreadAfterReadAll(await readJson(await api().notifications["read-all"].$post()));
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return parseNotification(await readJson(await api().notifications[":id"].read.$post({ param: { id } })));
}

export function apiBase(): string {
  return baseUrl();
}
