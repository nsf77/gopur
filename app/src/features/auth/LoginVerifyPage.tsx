import { useNavigate, useSearchParams } from "@solidjs/router";
import { Show, createSignal, onCleanup } from "solid-js";
import { ApiError, startEmailOtp, verifyEmailOtp } from "../../lib/api";
import { G } from "../../lib/belt";
import { digitsOnlyCode, safeNext } from "../../lib/email";
import { createForm } from "../../lib/form";
import { t } from "../../lib/i18n";
import { cooldownRemaining, startCooldown } from "../../lib/otp";
import { isSignedIn, setSession } from "../../lib/session";
import { queryClient } from "../../query";
import { Button } from "../../ui/Button";
import { OTP_LENGTH, OtpField } from "../../ui/OtpField";

const LOGIN_EMAIL_KEY = "gopur.login.email";

type VerifyForm = { code: string };

function codeError(code: string): string | undefined {
  return digitsOnlyCode(code).length === OTP_LENGTH ? undefined : t("auth.codeIncomplete");
}

export default function LoginVerifyPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [seconds, setSeconds] = createSignal(0);
  const next = () => safeNext(G.isString(params.next) ? params.next : undefined);
  const email = () => sessionStorage.getItem(LOGIN_EMAIL_KEY) ?? "";

  const timer = window.setInterval(() => setSeconds(cooldownRemaining(email())), 500);
  onCleanup(() => window.clearInterval(timer));
  setSeconds(cooldownRemaining(email()));

  if (isSignedIn()) {
    navigate(next(), { replace: true });
    return null;
  }
  if (!email()) {
    navigate(`/login?next=${encodeURIComponent(next())}`, { replace: true });
    return null;
  }

  const { api, values } = createForm<VerifyForm>(() => ({
    defaultValues: { code: "" },
    validators: {
      onChange: ({ value }) => codeError(value.code),
      onSubmit: ({ value }) => codeError(value.code),
    },
    onSubmit: ({ value }) => {
      void (async () => {
        setBusy(true);
        setError("");
        try {
          const response = await verifyEmailOtp(email(), digitsOnlyCode(value.code));
          setSession(response);
          queryClient.clear();
          await queryClient.invalidateQueries({ queryKey: ["me"] });
          await queryClient.invalidateQueries({ queryKey: ["feed"] });
          navigate(next());
        } catch (err) {
          setError(err instanceof ApiError ? t("auth.invalidCode") : t("errors.offline"));
          if (err instanceof ApiError && err.status === 401) api.setFieldValue("code", "");
        } finally {
          setBusy(false);
        }
      })();
    },
  }));

  const fieldError = () => {
    if (error()) return error();
    if (api.store.state.submissionAttempts === 0) return "";
    const first = api.store.state.errors[0];
    return typeof first === "string" ? first : "";
  };

  const onResend = async () => {
    if (seconds() > 0 || busy()) return;
    try {
      await startEmailOtp(email());
      startCooldown(email());
      setSeconds(cooldownRemaining(email()));
    } catch (err) {
      setError(err instanceof ApiError ? t("auth.invalidEmail") : t("errors.offline"));
    }
  };

  return (
    <main class="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 class="m-0 text-2xl font-extrabold tracking-tight">{t("auth.verifyTitle")}</h1>
      <p class="m-0 text-sm text-text-muted">{t("auth.verifySubtitle", { email: email() })}</p>
      <Show when={fieldError()}>
        <p class="m-0 text-sm text-accent" role="alert">
          {fieldError()}
        </p>
      </Show>
      <form
        class="flex flex-col gap-3"
        novalidate
        onSubmit={(event) => {
          event.preventDefault();
          void api.handleSubmit();
        }}
      >
        <OtpField
          name="code"
          label={t("auth.codeLabel")}
          value={values().code}
          disabled={busy()}
          invalid={Boolean(fieldError())}
          onChange={(code) => api.setFieldValue("code", digitsOnlyCode(code))}
          onComplete={() => void api.handleSubmit()}
        />
        <Button type="submit" disabled={busy()} class="min-h-11">
          {t("auth.verifyButton")}
        </Button>
      </form>
      <Button variant="ghost" disabled={seconds() > 0 || busy()} onClick={() => void onResend()}>
        {seconds() > 0 ? t("auth.resendIn", { seconds: seconds() }) : t("auth.resendCode")}
      </Button>
      <a class="text-sm font-semibold text-accent no-underline" href={`/login?next=${encodeURIComponent(next())}`}>
        {t("auth.changeEmail")}
      </a>
    </main>
  );
}
