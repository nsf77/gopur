import { isTeen, parseBirthdate } from "./age";
import { authConfig } from "./config";
import { one, run } from "./db";
import { getUser, str, type UserRow } from "./event";
import { hashOtp, issueToken, verifyToken } from "./jwt";
import { sendOTP } from "./mail";
import { restrictionCode } from "./profile";
import type { ErrorBody } from "./schemas";
import type { Bindings } from "./types";
import type { Context } from "hono";

export type AuthFail = { status: 401 | 403 | 400 | 502; body: ErrorBody };
export type AuthOutcome<T> = { ok: true; value: T } | { ok: false; error: AuthFail };

type AppCtx = Context<{ Bindings: Bindings }>;

function otpKey(email: string): string {
  return `otp:${email}`;
}

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
  if (!header) return { ok: true, value: null };
  if (!header.toLowerCase().startsWith("bearer ")) {
    return { ok: false, error: { status: 401, body: { error: "missing or invalid authorization header" } } };
  }
  return loadUser(c, header.slice(7).trim());
}

export async function requireAuth(c: AppCtx): Promise<AuthOutcome<UserRow>> {
  const header = c.req.header("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return { ok: false, error: { status: 401, body: { error: "missing or invalid authorization header" } } };
  }
  const loaded = await loadUser(c, header.slice(7).trim());
  if (!loaded.ok) return loaded;
  if (!loaded.value) return { ok: false, error: { status: 401, body: { error: "missing or invalid authorization header" } } };
  return { ok: true, value: loaded.value };
}

async function loadUser(c: AppCtx, token: string): Promise<AuthOutcome<UserRow | null>> {
  const cfg = authConfig(c.env);
  const id = await verifyToken(token, cfg.jwtSecret);
  if (!id) return { ok: false, error: { status: 401, body: { error: "invalid or expired token" } } };
  const session = await c.env.GOPUR_AUTH.get(sessionKey(id));
  if (session != null && session !== id) {
    return { ok: false, error: { status: 401, body: { error: "invalid or expired token" } } };
  }
  const user = await getUser(c.env.DB, id);
  if (!user) return { ok: false, error: { status: 401, body: { error: "invalid or expired token" } } };
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
  const cfg = authConfig(c.env);
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
  const otp = String(Math.floor(Math.random() * 10 ** cfg.otpLength)).padStart(cfg.otpLength, "0");
  const hash = await hashOtp(cfg.jwtSecret, email, otp);
  await c.env.GOPUR_AUTH.put(otpKey(email), hash, { expirationTtl: Math.max(cfg.otpExpiryMinutes * 60, 60) });
  try {
    await sendOTP(cfg, email, otp);
  } catch {
    return { ok: false, error: { status: 502, body: { error: "could not send verification code" } } };
  }
  return { ok: true, value: { message: "verification code sent" } };
}

export async function verifyEmailOtp(
  c: AppCtx,
  emailRaw: string,
  code: string,
  birthdate: string,
): Promise<AuthOutcome<{ token: string; user: UserRow }>> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !code) return { ok: false, error: { status: 400, body: { error: "email and code are required" } } };
  const cfg = authConfig(c.env);
  const stored = await c.env.GOPUR_AUTH.get(otpKey(email));
  const expected = await hashOtp(cfg.jwtSecret, email, code);
  if (!stored || stored !== expected) return { ok: false, error: { status: 401, body: { error: "invalid or expired code" } } };
  const created = await findOrCreateEmailUser(c, email, birthdate);
  if (!created.ok) return created;
  await c.env.GOPUR_AUTH.delete(otpKey(email));
  const token = await issueToken(str(created.value.id), cfg.jwtSecret, cfg.jwtExpirySeconds);
  await c.env.GOPUR_AUTH.put(sessionKey(str(created.value.id)), str(created.value.id), {
    expirationTtl: cfg.jwtExpirySeconds,
  });
  return { ok: true, value: { token, user: created.value } };
}

async function findOrCreateEmailUser(c: AppCtx, email: string, birthdate: string): Promise<AuthOutcome<UserRow>> {
  const ident = await one<{ user_id: string }>(
    c.env.DB,
    "SELECT user_id FROM identities WHERE provider = 'email' AND provider_subject = ? LIMIT 1",
    [email],
  );
  if (ident) {
    const user = await getUser(c.env.DB, ident.user_id);
    if (!user) return { ok: false, error: { status: 401, body: { error: "failed to load user" } } };
    return finishSignIn(c, user);
  }
  if (birthdate.trim()) {
    try {
      const age = parseBirthdate(birthdate);
      if (age < 13) return { ok: false, error: { status: 403, body: { error: "underage" } } };
    } catch (e) {
      return { ok: false, error: { status: 400, body: { error: e instanceof Error ? e.message : "invalid birthdate" } } };
    }
  }
  const id = crypto.randomUUID();
  await run(c.env.DB, "INSERT INTO users (id, email, display_name, credit_score) VALUES (?, ?, NULL, 0)", [id, email]);
  await run(c.env.DB, "INSERT INTO identities (id, user_id, provider, provider_subject) VALUES (?, ?, 'email', ?)", [
    crypto.randomUUID(),
    id,
    email,
  ]);
  let user = await getUser(c.env.DB, id);
  if (!user) return { ok: false, error: { status: 401, body: { error: "failed to load user" } } };
  if (birthdate.trim()) {
    const age = parseBirthdate(birthdate);
    const isPrivate = isTeen(age) && !Number(user.is_verified) ? 1 : user.is_private;
    await run(c.env.DB, "UPDATE users SET birthdate = ?, is_private = ?, updated_at = datetime('now') WHERE id = ?", [
      birthdate.trim(),
      Number(isPrivate),
      id,
    ]);
    user = await getUser(c.env.DB, id);
    if (!user) return { ok: false, error: { status: 401, body: { error: "failed to load user" } } };
  }
  return finishSignIn(c, user);
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
