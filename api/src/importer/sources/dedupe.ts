import { unmarshal, LOCALE_ZH, LOCALE_EN } from "../../i18n";
import { hktYmdKey } from "../sessions";

export type DedupeKey = { title: string; date: string; venue: string };

const DROP = new Set(
  "《》「」『』 \t\n\r　·•-–—_:;,!?.（）()[]【】".split(""),
);

export function normalizeTitle(title: string): string {
  let out = "";
  for (const ch of title.trim()) {
    if (DROP.has(ch) || /\s/.test(ch)) continue;
    out += ch;
  }
  return out.toLowerCase();
}

export function normalizeVenue(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split("")
    .filter((c) => ![" ", "　", "-", "–", "—", "(", ")", "（", "）"].includes(c))
    .join("");
}

export function makeKey(titleTc: string, start: Date, venueTc: string, venueEn: string): DedupeKey {
  return {
    title: normalizeTitle(titleTc),
    date: hktYmdKey(start),
    venue: normalizeVenue(firstNonEmpty(venueTc, venueEn)),
  };
}

export function titleTcFromI18n(raw: string): string {
  return (unmarshal(raw)?.[LOCALE_ZH] ?? "").trim();
}

export function venueFromI18n(raw: string): string {
  const m = unmarshal(raw);
  if (!m) return "";
  return firstNonEmpty(m[LOCALE_ZH] ?? "", m[LOCALE_EN] ?? "");
}

function firstNonEmpty(a: string, b: string): string {
  const x = a.trim();
  return x || b.trim();
}
