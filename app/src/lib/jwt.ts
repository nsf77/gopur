import { G, O, R, pipe } from "./belt";

function decodeBase64Url(part: string): R.Result<unknown, unknown> {
  return R.fromExecution(() => {
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    return JSON.parse(atob(padded + "=".repeat(padLen))) as unknown;
  });
}

export function jwtExpiry(token: string): O.Option<number> {
  const parts = token.split(".");
  const payload = parts[1];
  if (!payload) return O.None;
  return pipe(
    decodeBase64Url(payload),
    R.match(
      (value) => {
        if (!G.isObject(value)) return O.None;
        const exp = (value as { exp?: unknown }).exp;
        return G.isNumber(exp) ? O.Some(exp * 1000) : O.None;
      },
      () => O.None,
    ),
  );
}

export function jwtIsExpired(token: string, now = Date.now()): boolean {
  const exp = O.toNullable(jwtExpiry(token));
  return G.isNotNullable(exp) && exp <= now;
}
