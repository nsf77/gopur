import { createSignal } from "solid-js";
import type { User } from "api";

const TOKEN_KEY = "gopur.token";

const [token, setToken] = createSignal(localStorage.getItem(TOKEN_KEY) ?? "");
const [user, setUser] = createSignal<User | null>(null);

export function sessionToken(): string {
  return token();
}

export function sessionUser(): User | null {
  return user();
}

export function isSignedIn(): boolean {
  return Boolean(token());
}

export function setSession(nextToken: string, nextUser: User | null): void {
  setToken(nextToken);
  setUser(nextUser);
  if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearSession(): void {
  setSession("", null);
}

export function canCreateEvents(u: User | null): boolean {
  if (!u) return false;
  return u.is_verified || u.role === "admin";
}
