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

export function readLoginEmail(searchEmail?: string): string {
  if (searchEmail) return searchEmail.trim().toLowerCase();
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(LOGIN_EMAIL_KEY) ?? "";
}

export function rememberLoginEmail(email: string): void {
  sessionStorage.setItem(LOGIN_EMAIL_KEY, email);
}
