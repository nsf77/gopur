import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { startEmailOtp, verifyEmailOtp } from "../lib/api";
import { authStartError, authVerifyError } from "../lib/auth-error";
import { digitsOnlyCode, readLoginEmail, safeNext } from "../lib/email";
import { queryClient } from "../lib/query";
import { cooldownRemaining, startCooldown } from "../lib/otp";
import { m } from "../paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../stores/session";
import { Button } from "../ui/Button";
import { OTP_LENGTH, OtpField } from "../ui/OtpField";

export function LoginVerifyPage({ email: searchEmail, next }: { email?: string; next?: string }) {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const email = readLoginEmail(searchEmail);
  const target = safeNext(next);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(() => cooldownRemaining(email));

  useEffect(() => {
    if (isSignedIn()) {
      void navigate({ href: target, replace: true });
      return;
    }
    if (!email) {
      void navigate({ to: "/login", search: { next: next || undefined }, replace: true });
    }
  }, [email, next, target, navigate]);

  useEffect(() => {
    setSeconds(cooldownRemaining(email));
    const timer = window.setInterval(() => setSeconds(cooldownRemaining(email)), 500);
    return () => window.clearInterval(timer);
  }, [email]);

  const submit = (raw: string) => {
    const value = digitsOnlyCode(raw);
    if (value.length !== OTP_LENGTH) {
      setError(m.auth_codeIncomplete());
      return;
    }
    if (busy) return;
    setBusy(true);
    setError("");
    void verifyEmailOtp(email, value)
      .then((auth) => {
        setSession(auth);
        queryClient.clear();
        void navigate({ href: target });
      })
      .catch((err: unknown) => {
        setError(authVerifyError(err));
        setCode("");
      })
      .finally(() => {
        setBusy(false);
      });
  };

  if (!email) return null;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.auth_verifyTitle()}</h1>
      <p className="m-0 text-sm text-text-muted">{m.auth_verifySubtitle({ email })}</p>
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
          submit(code);
        }}
      >
        <OtpField
          name="code"
          label={m.auth_codeLabel()}
          value={code}
          disabled={busy}
          invalid={Boolean(error)}
          onValueChange={(value) => {
            setCode(digitsOnlyCode(value));
            setError("");
          }}
          onValueComplete={(value) => submit(value)}
        />
        <Button type="submit" disabled={busy} loading={busy} width="full">
          {busy ? m.common_loading() : m.auth_verifyButton()}
        </Button>
      </form>
      <Button
        variant="ghost"
        disabled={seconds > 0 || busy}
        onClick={() => {
          if (seconds > 0 || busy) return;
          void startEmailOtp(email)
            .then(() => {
              startCooldown(email);
              setSeconds(cooldownRemaining(email));
            })
            .catch((err: unknown) => {
              setError(authStartError(err));
            });
        }}
      >
        {seconds > 0 ? m.auth_resendIn({ seconds: String(seconds) }) : m.auth_resendCode()}
      </Button>
      <Link
        to="/login"
        search={{ next: next || undefined }}
        className="text-sm font-semibold text-accent no-underline"
      >
        {m.auth_changeEmail()}
      </Link>
    </main>
  );
}
