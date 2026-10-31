import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, emailOTP } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import { authConfig } from "./config";
import { one, run } from "./db";
import * as authSchema from "./db/auth-schema";
import { getUser, str, type UserRow } from "./event";
import { sendOTP } from "./mail";
import type { Bindings } from "./types";

export function originFromUrl(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "http://localhost:8787";
  }
}

export function createAuth(env: Bindings, requestUrl: string) {
  const origin = env.BETTER_AUTH_URL || originFromUrl(requestUrl);
  const db = drizzle(env.DB, { schema: authSchema });
  const cfg = authConfig(env);
  const secret = env.BETTER_AUTH_SECRET || cfg.jwtSecret;
  return betterAuth({
    secret,
    baseURL: origin,
    basePath: "/api/auth",
    database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
    trustedOrigins: [
      origin,
      "http://localhost:8081",
      "http://localhost:8787",
      "http://localhost:3000",
      "https://go.pur.run",
      "gopur://",
      "exp://",
    ],
    secondaryStorage: {
      get: async (key) => env.GOPUR_AUTH.get(key),
      getAndDelete: async (key) => {
        const value = await env.GOPUR_AUTH.get(key);
        if (value != null) await env.GOPUR_AUTH.delete(key);
        return value;
      },
      increment: async (key, ttl) => {
        const current = Number((await env.GOPUR_AUTH.get(key)) ?? "0");
        const next = (Number.isFinite(current) ? current : 0) + 1;
        await env.GOPUR_AUTH.put(key, String(next), { expirationTtl: Math.max(ttl, 60) });
        return next;
      },
      set: async (key, value, ttl) => {
        await env.GOPUR_AUTH.put(key, value, ttl ? { expirationTtl: Math.max(ttl, 60) } : undefined);
      },
      delete: async (key) => {
        await env.GOPUR_AUTH.delete(key);
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            const email = String(data.email ?? "").trim().toLowerCase();
            if (!email) return { data };
            const existing = await one<UserRow>(env.DB, "SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
            if (existing) {
              return {
                data: {
                  ...data,
                  id: str(existing.id),
                  name: str(existing.display_name) || str(existing.username) || email,
                  image: str(existing.avatar_url) || data.image,
                },
              };
            }
            return { data };
          },
          after: async (created) => {
            await ensureGopurUser(env, created.id, created.email, created.name, created.image ?? null);
          },
        },
      },
    },
    plugins: [
      expo(),
      bearer(),
      emailOTP({
        otpLength: cfg.otpLength,
        expiresIn: cfg.otpExpiryMinutes * 60,
        sendVerificationOTP: async ({ email, otp }) => {
          await sendOTP(cfg, email, otp);
        },
      }),
    ],
  });
}

export async function ensureGopurUser(
  env: Bindings,
  id: string,
  email: string,
  name?: string | null,
  image?: string | null,
): Promise<UserRow | null> {
  const normalized = email.trim().toLowerCase();
  const byId = await getUser(env.DB, id);
  if (byId) return byId;
  const byEmail = await one<UserRow>(env.DB, "SELECT * FROM users WHERE email = ? LIMIT 1", [normalized]);
  if (byEmail) {
    await run(env.DB, "INSERT OR IGNORE INTO identities (id, user_id, provider, provider_subject) VALUES (?, ?, 'email', ?)", [
      crypto.randomUUID(),
      str(byEmail.id),
      normalized,
    ]);
    return byEmail;
  }
  await run(env.DB, "INSERT INTO users (id, email, display_name, avatar_url, credit_score) VALUES (?, ?, ?, ?, 0)", [
    id,
    normalized,
    name?.trim() || null,
    image || null,
  ]);
  await run(env.DB, "INSERT OR IGNORE INTO identities (id, user_id, provider, provider_subject) VALUES (?, ?, 'email', ?)", [
    crypto.randomUUID(),
    id,
    normalized,
  ]);
  return getUser(env.DB, id);
}

export async function gopurUserFromAuth(
  env: Bindings,
  authUser: { id: string; email?: string | null; name?: string | null; image?: string | null },
): Promise<UserRow | null> {
  const byId = await getUser(env.DB, authUser.id);
  if (byId) return byId;
  const email = String(authUser.email ?? "").trim().toLowerCase();
  if (email) {
    const byEmail = await one<UserRow>(env.DB, "SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    if (byEmail) return byEmail;
  }
  return ensureGopurUser(env, authUser.id, email, authUser.name, authUser.image ?? null);
}
