import * as v from "valibot";

export const Healthz = v.object({
  ok: v.literal(true),
});

export type Healthz = v.InferOutput<typeof Healthz>;

export function parseHealthz(data: unknown): Healthz {
  return v.parse(Healthz, data);
}

export const I18nMap = v.record(v.string(), v.string());

export const PriceTier = v.object({
  cents: v.number(),
  label: v.nullable(v.string()),
});

export const EventLiker = v.object({
  id: v.string(),
  username: v.optional(v.string()),
  display_name: v.optional(v.string()),
  avatar_url: v.optional(v.string()),
});

export type EventLiker = v.InferOutput<typeof EventLiker>;

export const EventOrganizer = v.object({
  id: v.string(),
  is_verified: v.boolean(),
  imported: v.boolean(),
  display_name: v.optional(v.string()),
  username: v.optional(v.string()),
});

export const SessionRange = v.object({
  start_at: v.string(),
  end_at: v.string(),
});

export type SessionRange = v.InferOutput<typeof SessionRange>;

export const Event = v.object({
  id: v.string(),
  title: v.string(),
  description: v.string(),
  start_at: v.string(),
  end_at: v.string(),
  location: v.string(),
  title_i18n: I18nMap,
  description_i18n: I18nMap,
  location_i18n: I18nMap,
  type: v.string(),
  price_cents: v.nullable(v.number()),
  price_max_cents: v.nullable(v.number()),
  price_tiers: v.array(PriceTier),
  price_note: v.string(),
  price_note_i18n: I18nMap,
  external_url: v.nullable(v.string()),
  host_user_id: v.nullable(v.string()),
  source: v.nullable(v.string()),
  source_url: v.nullable(v.string()),
  source_url_generic: v.boolean(),
  detail_url: v.optional(v.string()),
  attribution: v.nullable(v.string()),
  attribution_url: v.nullable(v.string()),
  date_tbc: v.boolean(),
  official_note: v.nullable(v.string()),
  imported: v.boolean(),
  status: v.string(),
  latitude: v.nullable(v.number()),
  longitude: v.nullable(v.number()),
  district: v.nullable(v.string()),
  district_i18n: I18nMap,
  available_locales: v.array(v.string()),
  age_min: v.nullable(v.number()),
  age_max: v.nullable(v.number()),
  age_mode: v.string(),
  capacity: v.nullable(v.number()),
  going_count: v.number(),
  like_count: v.number(),
  save_count: v.number(),
  share_count: v.number(),
  liked_by_me: v.boolean(),
  saved_by_me: v.boolean(),
  liked_by: v.array(EventLiker),
  recurrence: v.unknown(),
  cover_image_url: v.nullable(v.string()),
  join_mode: v.string(),
  organizer: v.nullable(EventOrganizer),
  session_count: v.number(),
  next_session: v.nullable(SessionRange),
  sessions: v.optional(v.array(SessionRange)),
  score: v.optional(v.number()),
});

export type Event = v.InferOutput<typeof Event>;

export const EventList = v.object({
  events: v.array(Event),
});

export type EventList = v.InferOutput<typeof EventList>;

export const EventPage = v.object({
  events: v.array(Event),
  next_cursor: v.optional(v.string()),
  next_offset: v.optional(v.number()),
});

export type EventPage = v.InferOutput<typeof EventPage>;

export const PublicProfile = v.object({
  id: v.string(),
  is_private: v.boolean(),
  is_verified: v.boolean(),
  imported: v.boolean(),
  username: v.optional(v.string()),
  display_name: v.optional(v.string()),
  avatar_url: v.optional(v.string()),
  bio: v.optional(v.string()),
  viewer_follow_status: v.optional(v.string()),
  followed_by_me: v.optional(v.boolean()),
});

export type PublicProfile = v.InferOutput<typeof PublicProfile>;

export const Organizer = v.object({
  key: v.string(),
  name: v.string(),
  source: v.string(),
  upcoming_count: v.number(),
  name_i18n: v.optional(I18nMap),
  sources: v.optional(v.array(v.string())),
  source_user_id: v.optional(v.string()),
  attribution_url: v.optional(v.string()),
});

export type Organizer = v.InferOutput<typeof Organizer>;

export const OrganizerDirectory = v.object({
  sources: v.array(PublicProfile),
  organizers: v.array(Organizer),
});

export type OrganizerDirectory = v.InferOutput<typeof OrganizerDirectory>;

export const LikeState = v.object({ liked: v.boolean() });
export type LikeState = v.InferOutput<typeof LikeState>;

export const SaveState = v.object({ saved: v.boolean() });
export type SaveState = v.InferOutput<typeof SaveState>;

export const ShareState = v.object({ shared: v.boolean() });
export type ShareState = v.InferOutput<typeof ShareState>;

export function parseEvent(data: unknown): Event {
  return v.parse(Event, data);
}

export function parseEventPage(data: unknown): EventPage {
  return v.parse(EventPage, data);
}

export function parseOrganizerDirectory(data: unknown): OrganizerDirectory {
  return v.parse(OrganizerDirectory, data);
}

export function parseLikeState(data: unknown): LikeState {
  return v.parse(LikeState, data);
}

export function parseSaveState(data: unknown): SaveState {
  return v.parse(SaveState, data);
}

export function parseShareState(data: unknown): ShareState {
  return v.parse(ShareState, data);
}

export const User = v.object({
  id: v.string(),
  language: v.string(),
  age: v.nullable(v.number()),
  is_teen: v.boolean(),
  is_private: v.boolean(),
  is_verified: v.boolean(),
  imported: v.boolean(),
  needs_onboarding: v.boolean(),
  onboarding_missing: v.array(v.string()),
  credit_score: v.number(),
  role: v.string(),
  email: v.optional(v.string()),
  display_name: v.optional(v.string()),
  username: v.optional(v.string()),
  phone: v.optional(v.string()),
  avatar_url: v.optional(v.string()),
  bio: v.optional(v.string()),
  birthdate: v.optional(v.string()),
});

export type User = v.InferOutput<typeof User>;

export function parseUser(data: unknown): User {
  return v.parse(User, data);
}

export const AuthResponse = v.object({
  token: v.string(),
  user: User,
});

export type AuthResponse = v.InferOutput<typeof AuthResponse>;

export function parseAuthResponse(data: unknown): AuthResponse {
  return v.parse(AuthResponse, data);
}

export const MessageResponse = v.object({
  message: v.string(),
});

export type MessageResponse = v.InferOutput<typeof MessageResponse>;

export function parseMessageResponse(data: unknown): MessageResponse {
  return v.parse(MessageResponse, data);
}

export const ErrorBody = v.object({
  error: v.string(),
  code: v.optional(v.string()),
});

export type ErrorBody = v.InferOutput<typeof ErrorBody>;

export function parseErrorBody(data: unknown): ErrorBody | null {
  const result = v.safeParse(ErrorBody, data);
  return result.success ? result.output : null;
}
