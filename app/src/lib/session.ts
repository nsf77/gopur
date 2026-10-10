import { createSignal } from "solid-js";
import type { AuthResponse, User } from "api";
import { G, O, R, pipe } from "./belt";
import { jwtExpiry } from "./jwt";

export const SESSION_KEY = "gopur.session";

export type Session = {
  v: 1;
  token: string;
  user: User;
};

let currentSession: O.Option<Session> = O.None;
const [sessionVersion, setSessionVersion] = createSignal(0);

function writeSignal(next: O.Option<Session>): void {
  currentSession = next;
  setSessionVersion((n) => n + 1);
}

function parseSession(raw: string): O.Option<Session> {
  return R.match(
    R.fromExecution(() => JSON.parse(raw) as unknown),
    (value) => {
      if (!G.isObject(value)) return O.None;
      const record = value as Record<string, unknown>;
      if (record.v !== 1 || !G.isString(record.token) || !G.isObject(record.user)) return O.None;
      return O.Some({ v: 1 as const, token: record.token, user: record.user as User });
    },
    () => O.None,
  );
}

function persist(next: O.Option<Session>): void {
  pipe(
    next,
    O.match(
      (value) => localStorage.setItem(SESSION_KEY, JSON.stringify(value)),
      () => localStorage.removeItem(SESSION_KEY),
    ),
  );
  writeSignal(next);
}

function expired(session: Session, now: number): boolean {
  const exp = O.toNullable(jwtExpiry(session.token));
  return G.isNotNullable(exp) && exp <= now;
}

export function isSignedIn(): boolean {
  sessionVersion();
  return O.isSome(currentSession);
}

export function authToken(): O.Option<string> {
  sessionVersion();
  return pipe(currentSession, O.map((s) => s.token));
}

export function currentUser(): O.Option<User> {
  sessionVersion();
  return pipe(currentSession, O.map((s) => s.user));
}

export function setSession(auth: AuthResponse): void {
  persist(O.Some({ v: 1, token: auth.token, user: auth.user }));
}

export function updateUser(user: User): void {
  pipe(
    currentSession,
    O.match(
      (current) => persist(O.Some({ ...current, user })),
      () => undefined,
    ),
  );
}

const signOutListeners = new Set<() => void>();

export function onSignOut(fn: () => void): () => void {
  signOutListeners.add(fn);
  return () => signOutListeners.delete(fn);
}

export function signOut(): void {
  if (O.isNone(currentSession)) return;
  persist(O.None);
  for (const fn of signOutListeners) fn();
}

export function initSession(now = Date.now()): void {
  const raw = localStorage.getItem(SESSION_KEY);
  if (G.isNullable(raw)) {
    writeSignal(O.None);
    return;
  }
  const parsed = parseSession(raw);
  if (O.isNone(parsed) || expired(O.toNullable(parsed)!, now)) {
    localStorage.removeItem(SESSION_KEY);
    writeSignal(O.None);
    return;
  }
  writeSignal(parsed);
}

export function canCreateEvents(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.is_verified || user.role === "admin";
}
