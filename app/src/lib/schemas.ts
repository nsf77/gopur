import * as v from "valibot";

export const Healthz = v.object({
  ok: v.literal(true),
});

export type Healthz = v.InferOutput<typeof Healthz>;

export function parseHealthz(data: unknown): Healthz {
  return v.parse(Healthz, data);
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
