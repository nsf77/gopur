import { m } from "../paraglide/messages.js";
import { ApiError } from "./api";

function errorText(err: ApiError): string {
  return `${err.payload?.code ?? ""} ${err.payload?.error ?? err.body}`.toLowerCase();
}

export function authStartError(err: unknown): string {
  if (!(err instanceof ApiError)) return m.errors_offline();
  const text = errorText(err);
  if (err.status === 403 && text.includes("banned")) return m.auth_accountBanned();
  if (err.status === 403 && text.includes("suspended")) return m.auth_accountSuspended();
  if (err.status === 502) return m.auth_sendFailed();
  if (err.status === 429) return m.auth_tooManyAttempts();
  return m.auth_sendFailed();
}

export function authVerifyError(err: unknown): string {
  if (!(err instanceof ApiError)) return m.errors_offline();
  const text = errorText(err);
  if (err.status === 403 && text.includes("banned")) return m.auth_accountBanned();
  if (err.status === 403 && text.includes("suspended")) return m.auth_accountSuspended();
  if (err.status === 429) return m.auth_tooManyAttempts();
  if (err.status === 401) return m.auth_invalidCode();
  return m.auth_invalidCode();
}
