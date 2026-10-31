import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { O, pipe } from "@gopur/shared";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const KEY = "gopur.theme";
let preference: ThemePreference = "system";
const listeners = new Set<() => void>();

function isPref(value: string): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function themePreference(): ThemePreference {
  return preference;
}

export function systemTheme(): ResolvedTheme {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export function resolveTheme(pref: ThemePreference = preference): ResolvedTheme {
  if (pref === "light" || pref === "dark") return pref;
  return systemTheme();
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function setThemePreference(next: ThemePreference): void {
  preference = next;
  void AsyncStorage.setItem(KEY, next);
  emit();
}

export async function initTheme(): Promise<void> {
  const stored = await AsyncStorage.getItem(KEY);
  preference = pipe(
    O.fromNullable(stored),
    O.match(
      (value) => (isPref(value) ? value : "system"),
      () => "system" as ThemePreference,
    ),
  );
  emit();
}

Appearance.addChangeListener(() => {
  if (preference === "system") emit();
});
