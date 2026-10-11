import type { User } from "api";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SessionSlice = {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  signOut: () => void;
};

export const useSessionStore = create<SessionSlice>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      signOut: () => set({ token: null, user: null }),
    }),
    { name: "gopur.session" },
  ),
);

export function sessionToken(): string {
  return useSessionStore.getState().token ?? "";
}

export function isSignedIn(): boolean {
  return Boolean(useSessionStore.getState().token);
}
