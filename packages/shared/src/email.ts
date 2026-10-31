import { O } from "./belt";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LOGIN_EMAIL_KEY = "gopur.login.email";

export function normalizeEmail(raw: string): O.Option<string> {
  const trimmed = raw.trim().toLowerCase();
  return EMAIL_RE.test(trimmed) ? O.Some(trimmed) : O.None;
}

export function digitsOnlyCode(raw: string, max = 6): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

export function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) {
    return "/profile";
  }
  return raw;
}

const memory = new Map<string, string>();

function storeGet(key: string): string {
  if (typeof sessionStorage !== "undefined") return sessionStorage.getItem(key) ?? "";
  return memory.get(key) ?? "";
}

function storeSet(key: string, value: string): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(key, value);
    return;
  }
  memory.set(key, value);
}

export function readLoginEmail(searchEmail?: string): string {
  if (searchEmail) return searchEmail.trim().toLowerCase();
  return storeGet(LOGIN_EMAIL_KEY);
}

export function rememberLoginEmail(email: string): void {
  storeSet(LOGIN_EMAIL_KEY, email);
}
