import { hc } from "hono/client";
import type {
  AppType,
  AuthResponse,
  Event,
  EventList,
  EventPage,
  FollowState,
  LikeState,
  LikersPage,
  MyEventList,
  Notification,
  NotificationList,
  Organizer,
  OrganizerDirectory,
  PatchMe,
  PublicProfile,
  SaveState,
  ShareState,
  UnreadCount,
  User,
} from "api";
import { A, O, pipe } from "./belt";
import type { EventWriteBody } from "./event-draft";
import { authToken } from "./session";

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
  return createApiClient(pipe(authToken(), O.mapWithDefault("", (token) => token)));
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth() {
  return readJson(await api().healthz.$get());
}

export async function fetchFeed(cursor?: string): Promise<EventPage> {
  return readJson(await api().feed.$get({ query: cursor ? { cursor } : {} }));
}

export async function fetchExplore(query: { q?: string; type?: string; from?: string; to?: string }): Promise<EventList> {
  return readJson(await api().events.$get({ query }));
}

export async function fetchEvent(id: string): Promise<Event> {
  return readJson(await api().events[":id"].$get({ param: { id } }));
}

export async function fetchLikers(id: string, cursor?: string): Promise<LikersPage> {
  return readJson(
    await api().events[":id"].likers.$get({ param: { id }, query: cursor ? { cursor } : {} }),
  );
}

export async function searchEvents(query: Record<string, string | undefined>): Promise<EventPage> {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value) cleaned[key] = value;
  }
  return readJson(await api().search.events.$get({ query: cleaned }));
}

export async function fetchOrganizers(q?: string): Promise<OrganizerDirectory> {
  return readJson(await api().organizers.$get({ query: q ? { q } : {} }));
}

export async function fetchOrganizer(key: string): Promise<Organizer> {
  return readJson(await api().organizers[":key"].$get({ param: { key } }));
}

export async function startEmailOtp(email: string) {
  return readJson<{ message: string }>(await api().auth.email.start.$post({ json: { email } }));
}

export async function verifyEmailOtp(email: string, code: string, birthdate?: string): Promise<AuthResponse> {
  return readJson(
    await api().auth.email.verify.$post({ json: birthdate ? { email, code, birthdate } : { email, code } }),
  );
}

export async function fetchMe(): Promise<User> {
  return readJson(await api().me.$get());
}

export async function patchMe(body: PatchMe): Promise<User> {
  return readJson(await api().me.$patch({ json: body }));
}

export async function likeEvent(id: string): Promise<LikeState> {
  return readJson(await api().events[":id"].like.$post({ param: { id } }));
}

export async function unlikeEvent(id: string): Promise<LikeState> {
  return readJson(await api().events[":id"].like.$delete({ param: { id } }));
}

export async function saveEvent(id: string): Promise<SaveState> {
  return readJson(await api().events[":id"].save.$post({ param: { id } }));
}

export async function unsaveEvent(id: string): Promise<SaveState> {
  return readJson(await api().events[":id"].save.$delete({ param: { id } }));
}

export async function shareEvent(id: string): Promise<ShareState> {
  return readJson(await api().events[":id"].share.$post({ param: { id } }));
}

export async function fetchUser(id: string): Promise<PublicProfile> {
  return readJson(await api().users[":id"].$get({ param: { id } }));
}

export async function followUser(id: string): Promise<FollowState> {
  return readJson(await api().users[":id"].follow.$post({ param: { id } }));
}

export async function unfollowUser(id: string): Promise<FollowState> {
  return readJson(await api().users[":id"].follow.$delete({ param: { id } }));
}

export async function fetchMySignups(when: "upcoming" | "past"): Promise<MyEventList> {
  return readJson(await api().me.events.$get({ query: { when } }));
}

export async function fetchSavedEvents(): Promise<EventList> {
  return readJson(await api().me.saved.$get());
}

export async function fetchLikedEvents(): Promise<EventList> {
  return readJson(await api().me.likes.$get());
}

export async function fetchHostedEvents(userId: string): Promise<EventList> {
  return readJson(await api().users[":id"].events.$get({ param: { id: userId } }));
}

export async function createEvent(body: EventWriteBody): Promise<Event> {
  return readJson(await api().events.$post({ json: body }));
}

export async function updateEvent(id: string, body: EventWriteBody): Promise<Event> {
  return readJson(await api().events[":id"].$patch({ param: { id }, json: body }));
}

export async function fetchNotifications(cursor?: string): Promise<NotificationList> {
  return readJson(
    await api().notifications.$get({
      query: cursor ? { cursor, limit: "30" } : { limit: "30" },
    }),
  );
}

export async function fetchUnreadCount(): Promise<UnreadCount> {
  return readJson(await api().notifications["unread-count"].$get());
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return readJson(await api().notifications[":id"].read.$post({ param: { id } }));
}

export async function markAllNotificationsRead(): Promise<{ unread_count: number }> {
  return readJson(await api().notifications["read-all"].$post());
}

export function feedTitles(events: Event[]): readonly string[] {
  return pipe(events, A.filterMap((ev) => O.fromFalsy(ev.title)));
}
