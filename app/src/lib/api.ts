import { hc } from "hono/client";
import type { AppType, Event, EventPage, MyEvent, Notification, NotificationList, User } from "api";
import { A, O, pipe } from "@mobily/ts-belt";
import type { EventWriteBody } from "./event-draft";
import { sessionToken } from "./session";

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

const baseUrl = () => import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export const api = createApiClient(baseUrl());

export function clientWithToken(token: string): ApiClient {
  return createApiClient(baseUrl(), fetch, token);
}

export function authed(): ApiClient {
  return clientWithToken(sessionToken());
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string") {
      return (body as { error: string }).error;
    }
  } catch {
    /* ignore */
  }
  return `${fallback} ${res.status}`;
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

export async function fetchEvent(id: string): Promise<Event> {
  const res = await authed().events[":id"].$get({ param: { id } });
  if (!res.ok) throw new Error(await readError(res, "event"));
  return res.json() as Promise<Event>;
}

export async function likeEvent(eventId: string, token: string) {
  const res = await clientWithToken(token).events[":id"].like.$post({ param: { id: eventId } });
  if (!res.ok) throw new Error(`like ${res.status}`);
  return res.json();
}

export async function saveEvent(eventId: string, token: string) {
  const res = await clientWithToken(token).events[":id"].save.$post({ param: { id: eventId } });
  if (!res.ok) throw new Error(`save ${res.status}`);
  return res.json();
}

export async function startEmail(email: string) {
  const res = await api.auth.email.start.$post({ json: { email } });
  if (!res.ok) throw new Error(await readError(res, "email start"));
  return res.json();
}

export async function verifyEmail(email: string, code: string, birthdate?: string) {
  const res = await api.auth.email.verify.$post({ json: { email, code, birthdate } });
  if (!res.ok) throw new Error(await readError(res, "email verify"));
  return res.json();
}

export async function fetchMe(token: string): Promise<User> {
  const res = await clientWithToken(token).me.$get();
  if (!res.ok) throw new Error(await readError(res, "me"));
  return res.json() as Promise<User>;
}

export async function fetchMySignups(when: "upcoming" | "past"): Promise<MyEvent[]> {
  const res = await authed().me.events.$get({ query: { when } });
  if (!res.ok) throw new Error(await readError(res, "my events"));
  const body = (await res.json()) as { events: MyEvent[] };
  return body.events;
}

export async function fetchSavedEvents(): Promise<Event[]> {
  const res = await authed().me.saved.$get();
  if (!res.ok) throw new Error(await readError(res, "saved"));
  const body = (await res.json()) as { events: Event[] };
  return body.events;
}

export async function fetchLikedEvents(): Promise<Event[]> {
  const res = await authed().me.likes.$get();
  if (!res.ok) throw new Error(await readError(res, "likes"));
  const body = (await res.json()) as { events: Event[] };
  return body.events;
}

export async function fetchHostedEvents(userId: string): Promise<Event[]> {
  const res = await authed().users[":id"].events.$get({ param: { id: userId } });
  if (!res.ok) throw new Error(await readError(res, "hosted"));
  const body = (await res.json()) as { events: Event[] };
  return body.events;
}

export async function createEvent(body: EventWriteBody): Promise<Event> {
  const res = await authed().events.$post({ json: body });
  if (!res.ok) throw new Error(await readError(res, "create event"));
  return res.json() as Promise<Event>;
}

export async function updateEvent(id: string, body: EventWriteBody): Promise<Event> {
  const res = await authed().events[":id"].$patch({ param: { id }, json: body });
  if (!res.ok) throw new Error(await readError(res, "update event"));
  return res.json() as Promise<Event>;
}

export async function fetchNotifications(cursor?: string): Promise<NotificationList> {
  const res = await authed().notifications.$get({
    query: cursor ? { cursor, limit: "30" } : { limit: "30" },
  });
  if (!res.ok) throw new Error(await readError(res, "notifications"));
  return res.json() as Promise<NotificationList>;
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await authed().notifications["unread-count"].$get();
  if (!res.ok) throw new Error(await readError(res, "unread"));
  const body = (await res.json()) as { count: number };
  return body.count;
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const res = await authed().notifications[":id"].read.$post({ param: { id } });
  if (!res.ok) throw new Error(await readError(res, "mark read"));
  return res.json() as Promise<Notification>;
}

export async function markAllNotificationsRead(): Promise<{ unread_count: number }> {
  const res = await authed().notifications["read-all"].$post();
  if (!res.ok) throw new Error(await readError(res, "read all"));
  return res.json() as Promise<{ unread_count: number }>;
}

export function feedTitles(events: Event[]): readonly string[] {
  return pipe(events, A.filterMap((ev) => O.fromFalsy(ev.title)));
}
