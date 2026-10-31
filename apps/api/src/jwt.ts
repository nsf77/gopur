import { decodeBase64Url, encodeBase64Url, encodeBase64UrlBytes } from "./base64";

export const ISSUER = "gopur-api";

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

export async function issueToken(userId: string, secret: string, expirySeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({ sub: userId, iss: ISSUER, iat: now, exp: now + expirySeconds }),
  );
  const sig = encodeBase64UrlBytes(await hmac(secret, `${header}.${payload}`));
  return `${header}.${payload}.${sig}`;
}

export async function verifyToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = parts[0] ?? "";
  const payload = parts[1] ?? "";
  const sig = parts[2] ?? "";
  const expected = encodeBase64UrlBytes(await hmac(secret, `${header}.${payload}`));
  if (expected.length !== sig.length) return null;
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(sig);
  if (a.length !== b.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0) return null;
  try {
    const parsed: unknown = JSON.parse(decodeBase64Url(payload));
    if (!parsed || typeof parsed !== "object") return null;
    const rec = parsed as { sub?: unknown; exp?: unknown };
    const sub = typeof rec.sub === "string" ? rec.sub : "";
    const exp = Number(rec.exp ?? 0);
    if (!sub || !Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return null;
    return sub;
  } catch {
    return null;
  }
}

export async function hashOtp(secret: string, email: string, code: string): Promise<string> {
  return encodeBase64UrlBytes(await hmac(secret, `${email}:${code}`));
}
