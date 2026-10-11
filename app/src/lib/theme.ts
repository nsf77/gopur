import { O, pipe } from "./belt";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const KEY = "gopur.theme";

let preference: ThemePreference = "system";

function isPref(value: string): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function themePreference(): ThemePreference {
  return preference;
}

export function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "light" || pref === "dark") return pref;
  return systemTheme();
}

export function applyResolvedTheme(pref: ThemePreference = preference): void {
  const resolved = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-mode", resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#000000" : "#304385");
}

export function setThemePreference(next: ThemePreference): void {
  preference = next;
  localStorage.setItem(KEY, next);
  applyResolvedTheme(next);
}

export function initTheme(): void {
  preference = pipe(
    O.fromNullable(localStorage.getItem(KEY)),
    O.match(
      (value) => (isPref(value) ? value : "system"),
      () => "system" as ThemePreference,
    ),
  );
  applyResolvedTheme(preference);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (preference === "system") applyResolvedTheme("system");
  });
}
