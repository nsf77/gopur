import { O } from "./belt";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
