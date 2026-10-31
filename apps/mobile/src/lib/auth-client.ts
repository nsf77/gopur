import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { resolveBaseUrl } from "./resolve-base-url";

const memory = new Map<string, string>();

const webStorage = {
  getItem: (key: string) => {
    if (typeof localStorage !== "undefined") return localStorage.getItem(key);
    return memory.get(key) ?? null;
  },
  getItemAsync: async (key: string) => {
    if (typeof localStorage !== "undefined") return localStorage.getItem(key);
    return memory.get(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
      return;
    }
    memory.set(key, value);
  },
  setItemAsync: async (key: string, value: string) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
      return;
    }
    memory.set(key, value);
  },
};

export const authClient = createAuthClient({
  baseURL: resolveBaseUrl().auth,
  basePath: "/api/auth",
  plugins: [
    expoClient({
      scheme: "gopur",
      storagePrefix: "gopur",
      storage: Platform.OS === "web" ? webStorage : SecureStore,
    }),
    emailOTPClient(),
  ],
});
