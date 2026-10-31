import { isTeen, parseBirthdate } from "./age";
import { createAuth, gopurUserFromAuth } from "./better-auth";
import { authConfig } from "./config";
import { one, run } from "./db";
import { getUser, str, type UserRow } from "./event";
import { issueToken, verifyToken } from "./jwt";
import { restrictionCode } from "./profile";
import type { ErrorBody } from "./schemas";
import type { Bindings } from "./types";
import type { Context } from "hono";

export type AuthFail = { status: 401 | 403 | 400 | 502; body: ErrorBody };
export type AuthOutcome<T> = { ok: true; value: T } | { ok: false; error: AuthFail };

type AppCtx = Context<{ Bindings: Bindings }>;

function sessionKey(userId: string): string {
  return `sess:${userId}`;
}

export function replyAuth(c: AppCtx, fail: AuthFail) {
  return c.json(fail.body, fail.status);
}

export function takeAuth<T>(r: AuthOutcome<T>): AuthOutcome<T> {
  return r;
}

export async function optionalAuth(c: AppCtx): Promise<AuthOutcome<UserRow | null>> {
  const header = c.req.header("authorization") ?? "";
  if (!header) {
    const fromSession = await loadBetterAuthUser(c);
    if (!fromSession.ok) return fromSession;
    return { ok: true, value: fromSession.value };
  }
  if (!header.toLowerCase().startsWith("bearer ")) {
    return { ok: false, error: { status: 401, body: { error: "missing or invalid authorization header" } } };
  }
  return loadUser(c, header.slice(7).trim());
}

export async function requireAuth(c: AppCtx): Promise<AuthOutcome<UserRow>> {
  const loaded = await optionalAuth(c);
  if (!loaded.ok) return loaded;
  if (!loaded.value) {
    return { ok: false, error: { status: 401, body: { error: "missing or invalid authorization header" } } };
  }
  return { ok: true, value: loaded.value };
}

async function loadBetterAuthUser(c: AppCtx): Promise<AuthOutcome<UserRow | null>> {
  try {
    const auth = createAuth(c.env, c.req.url);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return { ok: true, value: null };
    const user = await gopurUserFromAuth(c.env, session.user);
    if (!user) return { ok: true, value: null };
    return finishLoaded(user);
  } catch {
    return { ok: true, value: null };
  }
}

async function loadUser(c: AppCtx, token: string): Promise<AuthOutcome<UserRow | null>> {
  const fromBetterAuth = await loadBetterAuthUser(c);
  if (!fromBetterAuth.ok) return fromBetterAuth;
  if (fromBetterAuth.value) return fromBetterAuth;

  const cfg = authConfig(c.env);
  const id = await verifyToken(token, cfg.jwtSecret);
  if (id) {
    const session = await c.env.GOPUR_AUTH.get(sessionKey(id));
    if (session != null && session !== id) {
      return { ok: false, error: { status: 401, body: { error: "invalid or expired token" } } };
    }
    const user = await getUser(c.env.DB, id);
    if (!user) return { ok: false, error: { status: 401, body: { error: "invalid or expired token" } } };
    return finishLoaded(user);
  }

  try {
    const auth = createAuth(c.env, c.req.url);
    const session = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    });
    if (!session?.user) return { ok: false, error: { status: 401, body: { error: "invalid or expired token" } } };
    const user = await gopurUserFromAuth(c.env, session.user);
    if (!user) return { ok: false, error: { status: 401, body: { error: "invalid or expired token" } } };
    return finishLoaded(user);
  } catch {
    return { ok: false, error: { status: 401, body: { error: "invalid or expired token" } } };
  }
}

function finishLoaded(user: UserRow): AuthOutcome<UserRow | null> {
  const code = restrictionCode(user);
  if (code) {
    return {
      ok: false,
      error: {
        status: 403,
        body: { error: code === "account_banned" ? "account banned" : "account suspended", code },
      },
    };
  }
  return { ok: true, value: user };
}

export async function startEmailOtp(c: AppCtx, emailRaw: string): Promise<AuthOutcome<{ message: string }>> {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return { ok: false, error: { status: 400, body: { error: "email is required" } } };
  const existing = await one<UserRow>(c.env.DB, "SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing) {
    const code = restrictionCode(existing);
    if (code) {
      return {
        ok: false,
        error: {
          status: 403,
          body: { error: code === "account_banned" ? "account banned" : "account suspended", code },
        },
      };
    }
  }
  try {
    const auth = createAuth(c.env, c.req.url);
    await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
  } catch {
    return { ok: false, error: { status: 502, body: { error: "could not send verification code" } } };
  }
  return { ok: true, value: { message: "verification code sent" } };
}

function sessionTokenFromUnknown(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const rec = value as { token?: unknown; session?: { token?: unknown } };
  if (typeof rec.token === "string" && rec.token) return rec.token;
  if (typeof rec.session?.token === "string") return rec.session.token;
  return "";
}

export async function verifyEmailOtp(
  c: AppCtx,
  emailRaw: string,
  code: string,
  birthdate: string,
): Promise<AuthOutcome<{ token: string; user: UserRow }>> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !code) return { ok: false, error: { status: 400, body: { error: "email and code are required" } } };
  let signed: unknown;
  try {
    const auth = createAuth(c.env, c.req.url);
    signed = await auth.api.signInEmailOTP({ body: { email, otp: code } });
  } catch {
    return { ok: false, error: { status: 401, body: { error: "invalid or expired code" } } };
  }
  const rec = signed && typeof signed === "object" ? (signed as { user?: { id?: string; email?: string; name?: string; image?: string | null } }) : null;
  const authUser = rec?.user;
  if (!authUser?.id) return { ok: false, error: { status: 401, body: { error: "invalid or expired code" } } };
  let user = await gopurUserFromAuth(c.env, {
    id: authUser.id,
    email: authUser.email ?? email,
    name: authUser.name,
    image: authUser.image,
  });
  if (!user) return { ok: false, error: { status: 401, body: { error: "failed to load user" } } };
  if (birthdate.trim() && !str(user.birthdate)) {
    try {
      const age = parseBirthdate(birthdate);
      if (age < 13) return { ok: false, error: { status: 403, body: { error: "underage" } } };
      const isPrivate = isTeen(age) && !Number(user.is_verified) ? 1 : user.is_private;
      await run(c.env.DB, "UPDATE users SET birthdate = ?, is_private = ?, updated_at = datetime('now') WHERE id = ?", [
        birthdate.trim(),
        Number(isPrivate),
        str(user.id),
      ]);
      user = await getUser(c.env.DB, str(user.id));
      if (!user) return { ok: false, error: { status: 401, body: { error: "failed to load user" } } };
    } catch (e) {
      return { ok: false, error: { status: 400, body: { error: e instanceof Error ? e.message : "invalid birthdate" } } };
    }
  }
  const finished = await finishSignIn(c, user);
  if (!finished.ok) return finished;
  let token = sessionTokenFromUnknown(signed);
  if (!token) {
    const cfg = authConfig(c.env);
    token = await issueToken(str(finished.value.id), cfg.jwtSecret, cfg.jwtExpirySeconds);
    await c.env.GOPUR_AUTH.put(sessionKey(str(finished.value.id)), str(finished.value.id), {
      expirationTtl: cfg.jwtExpirySeconds,
    });
  }
  return { ok: true, value: { token, user: finished.value } };
}

async function finishSignIn(c: AppCtx, user: UserRow): Promise<AuthOutcome<UserRow>> {
  const code = restrictionCode(user);
  if (code) {
    return {
      ok: false,
      error: {
        status: 403,
        body: { error: code === "account_banned" ? "account banned" : "account suspended", code },
      },
    };
  }
  const cfg = authConfig(c.env);
  const email = String(user.email ?? "").toLowerCase();
  if (str(user.role) !== "admin" && email && cfg.adminEmails.includes(email)) {
    await run(c.env.DB, "UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ?", [str(user.id)]);
    const updated = await getUser(c.env.DB, str(user.id));
    if (!updated) return { ok: false, error: { status: 401, body: { error: "failed to load user" } } };
    return { ok: true, value: updated };
  }
  return { ok: true, value: user };
}

export function viewerId(user: UserRow | null): string {
  return user ? str(user.id) : "";
}
