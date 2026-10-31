import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtIsExpired } from "../lib/jwt";
import type { AuthResponse, User } from "@gopur/shared";
import { queryClient } from "../lib/query";

export type SessionSlice = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setSession: (auth: AuthResponse) => void;
  updateUser: (user: User) => void;
  signOut: () => void;
};

export const useSessionStore = create<SessionSlice>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      setSession: (auth) => set({ token: auth.token, user: auth.user }),
      updateUser: (user) => set({ user }),
      signOut: () => {
        set({ token: null, user: null });
        queryClient.clear();
      },
    }),
    {
      name: "gopur.session",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token && jwtIsExpired(state.token)) state.signOut();
        state?.setHydrated(true);
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
