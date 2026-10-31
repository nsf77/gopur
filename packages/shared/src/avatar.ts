import { G, S, pipe } from "./belt";

function hashName(name: string): number {
  return pipe(
    name,
    S.trim,
    (s) => [...s],
    (chars) => chars.reduce((acc, ch) => ((acc * 31 + (ch.codePointAt(0) ?? 0)) >>> 0), 0),
  );
}

export function organizerColorFromName(name: string): string {
  const trimmed = S.trim(name);
  if (S.isEmpty(trimmed)) return "#737373";
  return `hsl(${hashName(trimmed) % 360} 55% 45%)`;
}

export function organizerInitial(name: string | undefined | null): string {
  if (G.isNullable(name) || S.isEmpty(S.trim(name))) return "?";
  return [...S.trim(name)][0] ?? "?";
}
