import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { startEmailOtp } from "../lib/api";
import { authStartError } from "../lib/auth-error";
import { O, pipe } from "../lib/belt";
import { LOGIN_EMAIL_KEY, normalizeEmail, rememberLoginEmail, safeNext } from "../lib/email";
import { startCooldown } from "../lib/otp";
import { m } from "../paraglide/messages.js";
import { isSignedIn } from "../stores/session";
import { Button } from "../ui/Button";
import { TextField } from "../ui/TextField";

export function LoginPage({ next }: { next?: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(() =>
    typeof sessionStorage === "undefined" ? "" : (sessionStorage.getItem(LOGIN_EMAIL_KEY) ?? ""),
  );
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safeNext(next);

  useEffect(() => {
    if (!isSignedIn()) return;
    void navigate({ href: target, replace: true });
  }, [target, navigate]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.auth_welcome()}</h1>
      <p className="m-0 text-sm text-text-muted">{m.auth_subtitle()}</p>
      {error ? (
        <p className="m-0 text-sm text-accent" role="alert">
          {error}
        </p>
      ) : null}
      <form
        className="flex flex-col gap-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const address = pipe(normalizeEmail(email), O.toNullable);
          if (!address) {
            setEmailError(m.auth_invalidEmail());
            return;
          }
          setBusy(true);
          setError("");
          setEmailError("");
          void startEmailOtp(address)
            .then(() => {
              rememberLoginEmail(address);
              startCooldown(address);
              void navigate({
                to: "/login/verify",
                search: { email: address, next: next || undefined },
              });
            })
            .catch((err: unknown) => {
              setError(authStartError(err));
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      >
        <TextField
          name="email"
          label={m.auth_emailLabel()}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={m.auth_emailPlaceholder()}
          value={email}
          disabled={busy}
          invalid={Boolean(emailError)}
          error={emailError}
          onValueChange={(value) => {
            setEmail(value);
            setEmailError("");
            setError("");
          }}
        />
        <Button type="submit" disabled={busy} loading={busy} width="full">
          {busy ? m.common_loading() : m.auth_sendCode()}
        </Button>
      </form>
    </main>
  );
}
