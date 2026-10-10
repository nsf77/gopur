import { useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import IconBell from "~icons/lucide/bell";
import IconPencil from "~icons/lucide/pencil";
import { t, locale, setLocale, type AppLocale } from "../../lib/i18n";
import { isSignedIn, signOut } from "../../lib/session";
import { patchMe } from "../../lib/api";
import { setThemePreference, themePreference, type ThemePreference } from "../../lib/theme";
import { Button } from "../../ui/Button";
import { ConfirmDialog } from "../../ui/Dialog";
import { RadioGroup } from "../../ui/RadioGroup";

const ROW = "flex min-h-11 items-center gap-3 rounded-xl px-2 font-semibold text-text hover:bg-surface-elevated";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [signOutOpen, setSignOutOpen] = createSignal(false);
  const [theme, setTheme] = createSignal(themePreference());

  const onLanguage = async (next: AppLocale) => {
    setLocale(next);
    if (isSignedIn()) {
      try {
        await patchMe({ language: next });
      } catch {
        /* ignore */
      }
    }
    location.reload();
  };

  return (
    <main class="mx-auto flex max-w-md flex-col gap-6 p-4 pb-24">
      <section class="grid gap-2">
        <h2 class="m-0 text-base font-bold">{t("settings.appearance.title")}</h2>
        <RadioGroup
          name="settings-theme"
          aria-label={t("settings.appearance.title")}
          value={theme()}
          options={[
            { value: "system", label: t("settings.appearance.system") },
            { value: "light", label: t("settings.appearance.light") },
            { value: "dark", label: t("settings.appearance.dark") },
          ]}
          onChange={(value) => {
            const next = value as ThemePreference;
            setTheme(next);
            setThemePreference(next);
          }}
        />
      </section>
      <section class="grid gap-2">
        <h2 class="m-0 text-base font-bold">{t("settings.language")}</h2>
        <p class="m-0 text-sm text-text-muted">{t("settings.languageHint")}</p>
        <RadioGroup
          name="settings-language"
          aria-label={t("settings.language")}
          value={locale()}
          options={[
            { value: "zh-Hant", label: "繁體中文" },
            { value: "en", label: "English" },
          ]}
          onChange={(value) => void onLanguage(value as AppLocale)}
        />
      </section>
      <Show when={isSignedIn()}>
        <section class="grid gap-2">
          <h2 class="m-0 text-base font-bold">{t("settings.account")}</h2>
          <a class={ROW} href="/profile/edit">
            <IconPencil class="size-5" aria-hidden="true" />
            {t("settings.editProfile")}
          </a>
          <a class={ROW} href="/notifications">
            <IconBell class="size-5" aria-hidden="true" />
            {t("notifications.title")}
          </a>
          <Button variant="secondary" class="min-h-11" onClick={() => setSignOutOpen(true)}>
            {t("settings.signOut")}
          </Button>
        </section>
      </Show>
      <ConfirmDialog
        open={signOutOpen()}
        title={t("settings.signOut")}
        confirmLabel={t("settings.signOut")}
        cancelLabel={t("common.back")}
        onOpenChange={setSignOutOpen}
        onConfirm={() => {
          signOut();
          setSignOutOpen(false);
          navigate("/", { replace: true });
        }}
      >
        {t("profile.signOutConfirm")}
      </ConfirmDialog>
    </main>
  );
}
