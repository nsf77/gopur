import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtIsExpired } from "../lib/jwt";
import type { AuthResponse, User } from "../lib/schemas";
import { queryClient } from "../lib/query";

export type SessionSlice = {
  token: string | null;
  user: User | null;
  setSession: (auth: AuthResponse) => void;
  updateUser: (user: User) => void;
  signOut: () => void;
};

export const useSessionStore = create<SessionSlice>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (auth) => set({ token: auth.token, user: auth.user }),
      updateUser: (user) => set({ user }),
      signOut: () => {
        set({ token: null, user: null });
        queryClient.clear();
      },
    }),
    {
      name: "gopur.session",
      onRehydrateStorage: () => (state) => {
        if (state?.token && jwtIsExpired(state.token)) state.signOut();
      },
    },
  ),
);

export function sessionToken(): string {
  const token = useSessionStore.getState().token;
  if (!token) return "";
  if (jwtIsExpired(token)) {
    useSessionStore.getState().signOut();
    return "";
  }
  return token;
}

export function isSignedIn(): boolean {
  return Boolean(sessionToken());
}

export function viewerId(): string {
  return useSessionStore.getState().user?.id ?? "";
}
