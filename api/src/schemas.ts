import { type } from "arktype";

export const ErrorBody = type({
  error: "string",
  "code?": "string",
});

export type ErrorBody = typeof ErrorBody.infer;

const invalidHook = (message = "invalid request") =>
  ((result: { success: boolean }, c: { json: (body: ErrorBody, status: 400) => Response }) => {
    if (!result.success) return c.json({ error: message }, 400);
    return;
  });

export const invalidQuery = invalidHook("invalid request");
export const invalidParam = invalidHook("invalid request");

export const PageQuery = type({
  "limit?": "string",
  "cursor?": "string",
  "offset?": "string",
  "lang?": "string",
  "locale?": "string",
});

export type PageQuery = typeof PageQuery.infer;

export const ExploreQuery = type({
  "q?": "string",
  "type?": "string",
  "from?": "string",
  "to?": "string",
  "lang?": "string",
  "locale?": "string",
});

export type ExploreQuery = typeof ExploreQuery.infer;

export const SearchEventsQuery = type({
  "q?": "string",
  "type?": "string",
  "from?": "string",
  "to?": "string",
  "district?": "string",
  "source?": "string",
  "imported?": "string",
  "organizer?": "string",
  "price?": "string",
  "weekend?": "string",
  "age?": "string",
  "radius_km?": "string",
  "sort?": "string",
  "limit?": "string",
  "cursor?": "string",
  "offset?": "string",
  "lang?": "string",
  "locale?": "string",
});

export type SearchEventsQuery = typeof SearchEventsQuery.infer;

export const EventIdParam = type({ id: "string" });
export type EventIdParam = typeof EventIdParam.infer;

export const OrganizerKeyParam = type({ key: "string" });
export type OrganizerKeyParam = typeof OrganizerKeyParam.infer;

export const LikersQuery = type({
  "limit?": "string",
  "cursor?": "string",
});

export type LikersQuery = typeof LikersQuery.infer;

export const OrganizersQuery = type({
  "q?": "string",
  "limit?": "string",
  "offset?": "string",
});

export type OrganizersQuery = typeof OrganizersQuery.infer;

export const I18nMap = type("Record<string, string>");
export type I18nMap = typeof I18nMap.infer;

export const PriceTier = type({
  cents: "number",
  label: "string | null",
});

export type PriceTier = typeof PriceTier.infer;

export const EventLiker = type({
  id: "string",
  "username?": "string",
  "display_name?": "string",
  "avatar_url?": "string",
});

export type EventLiker = typeof EventLiker.infer;

export const EventOrganizer = type({
  id: "string",
  is_verified: "boolean",
  imported: "boolean",
  "display_name?": "string",
  "username?": "string",
});

export type EventOrganizer = typeof EventOrganizer.infer;

export const SessionRange = type({
  start_at: "string",
  end_at: "string",
});

export type SessionRange = typeof SessionRange.infer;

export const Event = type({
  id: "string",
  title: "string",
  description: "string",
  start_at: "string",
  end_at: "string",
  location: "string",
  title_i18n: I18nMap,
  description_i18n: I18nMap,
  location_i18n: I18nMap,
  type: "string",
  price_cents: "number | null",
  price_max_cents: "number | null",
  price_tiers: PriceTier.array(),
  price_note: "string",
  price_note_i18n: I18nMap,
  external_url: "string | null",
  host_user_id: "string | null",
  source: "string | null",
  source_url: "string | null",
  source_url_generic: "boolean",
  "detail_url?": "string",
  attribution: "string | null",
  attribution_url: "string | null",
  date_tbc: "boolean",
  official_note: "string | null",
  imported: "boolean",
  status: "string",
  latitude: "number | null",
  longitude: "number | null",
  district: "string | null",
  district_i18n: I18nMap,
  available_locales: "string[]",
  age_min: "number | null",
  age_max: "number | null",
  age_mode: "string",
  capacity: "number | null",
  going_count: "number",
  like_count: "number",
  save_count: "number",
  share_count: "number",
  liked_by_me: "boolean",
  saved_by_me: "boolean",
  liked_by: EventLiker.array(),
  recurrence: "unknown",
  cover_image_url: "string | null",
  join_mode: "string",
  organizer: EventOrganizer.or("null"),
  session_count: "number",
  next_session: SessionRange.or("null"),
  "sessions?": SessionRange.array(),
  "score?": "number",
});

export type Event = typeof Event.infer;

export const EventList = type({ events: Event.array() });
export type EventList = typeof EventList.infer;

export const EventPage = type({
  events: Event.array(),
  "next_cursor?": "string",
  "next_offset?": "number",
});

export type EventPage = typeof EventPage.infer;

export const PublicProfile = type({
  id: "string",
  is_private: "boolean",
  is_verified: "boolean",
  imported: "boolean",
  "username?": "string",
  "display_name?": "string",
  "avatar_url?": "string",
  "bio?": "string",
  "viewer_follow_status?": "string",
  "followed_by_me?": "boolean",
});

export type PublicProfile = typeof PublicProfile.infer;

export const LikersPage = type({
  users: PublicProfile.array(),
  "next_cursor?": "string",
});

export type LikersPage = typeof LikersPage.infer;

export const Organizer = type({
  key: "string",
  name: "string",
  source: "string",
  upcoming_count: "number",
  "name_i18n?": I18nMap,
  "sources?": "string[]",
  "source_user_id?": "string",
  "attribution_url?": "string",
});

export type Organizer = typeof Organizer.infer;

export const OrganizerDirectory = type({
  sources: PublicProfile.array(),
  organizers: Organizer.array(),
});

export type OrganizerDirectory = typeof OrganizerDirectory.infer;
