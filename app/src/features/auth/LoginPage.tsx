import { useNavigate, useSearchParams } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { ApiError, startEmailOtp } from "../../lib/api";
import { G, O } from "../../lib/belt";
import { normalizeEmail, safeNext } from "../../lib/email";
import { t } from "../../lib/i18n";
import { startCooldown } from "../../lib/otp";
import { isSignedIn } from "../../lib/session";
import { Button } from "../../ui/Button";

const LOGIN_EMAIL_KEY = "gopur.login.email";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = createSignal("");
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const next = () => safeNext(G.isString(params.next) ? params.next : undefined);

  if (isSignedIn()) {
    navigate(next(), { replace: true });
    return null;
  }

  const onSubmit = async (event: Event) => {
    event.preventDefault();
    const address = O.toNullable(normalizeEmail(email()));
    if (!address) {
      setError(t("auth.invalidEmail"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await startEmailOtp(address);
      sessionStorage.setItem(LOGIN_EMAIL_KEY, address);
      startCooldown(address);
      navigate(`/login/verify?next=${encodeURIComponent(next())}`);
    } catch (err) {
      setError(err instanceof ApiError ? t("auth.invalidEmail") : t("errors.offline"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main class="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <h1 class="m-0 text-2xl font-extrabold tracking-tight">{t("auth.welcome")}</h1>
      <p class="m-0 text-sm text-text-muted">{t("auth.subtitle")}</p>
      <Show when={error()}>
        <p class="m-0 text-sm text-accent">{error()}</p>
      </Show>
      <form class="flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
        <label class="grid gap-1 text-sm font-medium">
          {t("auth.emailLabel")}
          <input
            class="min-h-11 rounded-md border border-divider bg-surface px-3"
            type="email"
            inputmode="email"
            autocomplete="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
          />
        </label>
        <Button type="submit" disabled={busy()} class="min-h-11">
          {t("auth.sendCode")}
        </Button>
      </form>
    </main>
  );
}
