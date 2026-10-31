// Metro inlines only static `process.env.EXPO_PUBLIC_*` member access.
// `eas.json` build.env is applied on `eas build`, not `eas update`.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://go.pur.run/api";
const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL ?? "https://go.pur.run";

export function resolveBaseUrl(): { api: string; auth: string } {
  return {
    api: API_URL.replace(/\/$/, ""),
    auth: AUTH_URL.replace(/\/$/, ""),
  };
}
