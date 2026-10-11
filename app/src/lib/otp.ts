import { G, O, R, pipe } from "./belt";

const STORAGE_KEY = "gopur.otp.cooldown";
export const RESEND_COOLDOWN_S = 60;

type CooldownMap = Record<string, number>;

function readMap(): CooldownMap {
  if (typeof sessionStorage === "undefined") return {};
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return pipe(
    O.fromNullable(raw),
    O.match(
      (text) =>
        pipe(
          R.fromExecution(() => JSON.parse(text) as unknown),
          R.match(
            (value) => (G.isObject(value) ? (value as CooldownMap) : {}),
            () => ({} as CooldownMap),
          ),
        ),
      () => ({} as CooldownMap),
    ),
  );
}

export function cooldownRemaining(email: string, now = Date.now()): number {
  const started = readMap()[email.trim().toLowerCase()];
  if (G.isNullable(started)) return 0;
  const leftMs = started + RESEND_COOLDOWN_S * 1000 - now;
  return leftMs > 0 ? Math.ceil(leftMs / 1000) : 0;
}

export function startCooldown(email: string, now = Date.now()): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...readMap(), [email.trim().toLowerCase()]: now }),
  );
}
