import { isTeen, parseBirthdate } from "./age";
import { all, one, run } from "./db";
import { getUser, type UserRow } from "./event";
import type { D1Database } from "@cloudflare/workers-types";

export const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/;

const RESERVED = new Set([
  "admin", "administrator", "anonymous", "api", "fundraising", "gopur", "govhk",
  "help", "lcsd", "lcsd_cultural", "lcsd_smartplay", "login", "logout", "mail",
  "m_mark", "me", "mod", "moderator", "null", "official", "register", "root",
  "security", "settings", "signup", "smartplay", "smart_silver", "staff",
  "support", "system", "test", "undefined", "urbtix", "wwf_hk", "hkpl", "www",
]);

export function isReservedUsername(username: string): boolean {
  const u = username.toLowerCase().trim();
  if (!u) return false;
  if (RESERVED.has(u)) return true;
  return u.startsWith("gopur");
}

export function restrictionCode(user: { banned_at?: unknown; suspended_until?: unknown }, now = new Date()): string {
  if (String(user.banned_at ?? "").trim()) return "account_banned";
  const raw = String(user.suspended_until ?? "").trim();
  if (!raw) return "";
  const until = Date.parse(raw);
  if (!Number.isNaN(until) && now.getTime() < until) return "account_suspended";
  return "";
}

export class ProfileError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function normalizeUsername(raw: string): string {
  raw = raw.trim();
  if (!USERNAME_RE.test(raw)) throw new ProfileError("invalid username", 400);
  const username = raw.toLowerCase();
  if (isReservedUsername(username)) throw new ProfileError("username_reserved", 422);
  return username;
}

export function normalizeLanguage(raw: string): string {
  const v = raw.trim();
  if (v === "en" || v === "zh-Hant") return v;
  throw new ProfileError("language must be en or zh-Hant", 400);
}

export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!email) return "";
  if (email.length > 254 || /[ \t]/.test(email)) throw new ProfileError("invalid email", 400);
  const at = email.indexOf("@");
  if (at < 0) throw new ProfileError("invalid email", 400);
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    throw new ProfileError("invalid email", 400);
  }
  return email;
}

export function normalizePhone(raw: string): string {
  const phone = raw.trim();
  if (!phone) return "";
  let digits = 0;
  for (const ch of phone) {
    if (ch >= "0" && ch <= "9") digits++;
    else if (ch === "+" || ch === "-" || ch === " " || ch === "(" || ch === ")") continue;
    else throw new ProfileError("invalid phone", 400);
  }
  if (digits < 8 || digits > 15) throw new ProfileError("invalid phone", 400);
  return phone;
}

export function normalizeDisplayName(raw: string): string {
  const name = raw.trim();
  if ([...name].length > 50) throw new ProfileError("display name is too long", 400);
  return name;
}

export function normalizeBio(raw: string): string {
  const bio = raw.trim();
  if ([...bio].length > 300) throw new ProfileError("bio is too long", 400);
  return bio;
}

export function normalizeAvatarUrl(raw: string): string {
  const avatar = raw.trim();
  if (!avatar) return "";
  if (avatar.length > 500) throw new ProfileError("invalid avatar url", 400);
  try {
    const u = new URL(avatar);
    if (!u.host || (u.protocol !== "http:" && u.protocol !== "https:")) throw new Error("bad");
  } catch {
    throw new ProfileError("invalid avatar url", 400);
  }
  return avatar;
}

function emptyOrNull(v: string): string | null {
  return v ? v : null;
}

export async function patchProfile(db: D1Database, user: UserRow, req: Record<string, unknown>): Promise<UserRow> {
  let displayName = user.display_name == null ? null : String(user.display_name);
  let username = user.username == null ? null : String(user.username);
  let email = user.email == null ? null : String(user.email);
  let phone = user.phone == null ? null : String(user.phone);
  let language = String(user.language || "zh-Hant");
  let avatar = user.avatar_url == null ? null : String(user.avatar_url);
  let bio = user.bio == null ? null : String(user.bio);
  let birthdate = user.birthdate == null ? null : String(user.birthdate);
  let isPrivate = Number(user.is_private);
  let emailChanged = false;
  if (req.display_name !== undefined) displayName = emptyOrNull(normalizeDisplayName(String(req.display_name)));
  if (req.username !== undefined) username = normalizeUsername(String(req.username));
  if (req.email !== undefined) {
    const next = normalizeEmail(String(req.email));
    if (next !== (email ?? "")) {
      emailChanged = true;
      email = emptyOrNull(next);
    }
  }
  if (req.phone !== undefined) phone = emptyOrNull(normalizePhone(String(req.phone)));
  if (req.language !== undefined) language = normalizeLanguage(String(req.language));
  if (req.avatar_url !== undefined) avatar = emptyOrNull(normalizeAvatarUrl(String(req.avatar_url)));
  if (req.bio !== undefined) bio = emptyOrNull(normalizeBio(String(req.bio)));
  if (req.birthdate !== undefined) {
    const raw = String(req.birthdate).trim();
    const current = birthdate;
    if (!raw) {
      if (current) throw new ProfileError("birthdate cannot be cleared", 400);
    } else if (current && current !== raw) {
      throw new ProfileError("birthdate_locked", 422);
    } else {
      const age = parseBirthdate(raw);
      if (age < 13) throw new ProfileError("underage", 422);
      const changed = current !== raw;
      birthdate = raw;
      if (changed && isTeen(age) && !Number(user.is_verified) && req.is_private === undefined) isPrivate = 1;
    }
  }
  if (req.is_private !== undefined) {
    if (req.is_private && Number(user.is_verified)) throw new ProfileError("verified accounts cannot be private", 400);
    isPrivate = req.is_private ? 1 : 0;
  }
  const becamePublic = Number(user.is_private) !== 0 && isPrivate === 0;
  if (username && username !== String(user.username ?? "")) {
    const existing = await one<{ id: string }>(db, "SELECT id FROM users WHERE lower(username) = ? LIMIT 1", [username]);
    if (existing && existing.id !== user.id) throw new ProfileError("username_taken", 409);
  }
  if (email && email !== String(user.email ?? "")) {
    const ident = await one<{ user_id: string }>(
      db,
      "SELECT user_id FROM identities WHERE provider = 'email' AND provider_subject = ? LIMIT 1",
      [email],
    );
    if (ident && ident.user_id !== user.id) throw new ProfileError("email already in use", 409);
    const byEmail = await one<{ id: string }>(db, "SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (byEmail && byEmail.id !== user.id) throw new ProfileError("email already in use", 409);
  }
  if (emailChanged && !email) {
    const providers = await all<{ provider: string }>(db, "SELECT provider FROM identities WHERE user_id = ?", [String(user.id)]);
    if (providers.some((p) => p.provider === "email")) throw new ProfileError("email is required", 400);
  }
  try {
    await run(
      db,
      `UPDATE users SET display_name = ?, username = ?, email = ?, phone = ?, language = ?, avatar_url = ?, bio = ?, birthdate = ?, is_private = ?, updated_at = datetime('now') WHERE id = ?`,
      [displayName, username, email, phone, language, avatar, bio, birthdate, isPrivate, String(user.id)],
    );
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new ProfileError("username_taken", 409);
    throw e;
  }
  if (emailChanged && email) {
    try {
      await run(db, "UPDATE identities SET provider_subject = ? WHERE user_id = ? AND provider = 'email'", [email, String(user.id)]);
    } catch (e) {
      if (String(e).includes("UNIQUE")) throw new ProfileError("email already in use", 409);
      throw e;
    }
  }
  if (becamePublic) {
    await run(db, "UPDATE follows SET status = 'accepted', updated_at = datetime('now') WHERE followee_id = ? AND status = 'pending'", [
      String(user.id),
    ]);
  }
  const saved = await getUser(db, String(user.id));
  if (!saved) throw new ProfileError("user not found", 404);
  return saved;
}
