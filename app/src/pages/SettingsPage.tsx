import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { getLocale, setLocale } from "../paraglide/runtime.js";
import { m } from "../paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../stores/session";
import { usePatchMe } from "../lib/queries";
import { setThemePreference, themePreference, type ThemePreference } from "../lib/theme";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/Dialog";
import { RadioGroup } from "../ui/RadioGroup";

const ROW =
  "flex min-h-11 items-center gap-3 rounded-xl px-2 font-semibold text-text hover:bg-surface-elevated";

export function SettingsPage() {
  const navigate = useNavigate();
  const signedIn = isSignedIn();
  const signOut = useSessionStore((s) => s.signOut);
  const patchMe = usePatchMe();
  const locale = getLocale();
  const [theme, setTheme] = useState<ThemePreference>(() => themePreference());
  const [signOutOpen, setSignOutOpen] = useState(false);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-4 pb-8">
      <section className="grid gap-2">
        <h2 className="m-0 text-base font-bold">{m.settings_appearance_title()}</h2>
        <RadioGroup
          aria-label={m.settings_appearance_title()}
          name="settings-theme"
          value={theme}
          onValueChange={(value) => {
            const next = value === "light" || value === "dark" ? value : "system";
            setTheme(next);
            setThemePreference(next);
          }}
          options={[
            { value: "system", label: m.settings_appearance_system() },
            { value: "light", label: m.settings_appearance_light() },
            { value: "dark", label: m.settings_appearance_dark() },
          ]}
        />
      </section>
      <section className="grid gap-2">
        <h2 className="m-0 text-base font-bold">{m.settings_language()}</h2>
        <p className="m-0 text-sm text-text-muted">{m.settings_languageHint()}</p>
        <RadioGroup
          aria-label={m.settings_language()}
          name="settings-language"
          value={locale}
          onValueChange={(value) => {
            const next = value === "en" ? "en" : "zh-Hant";
            setLocale(next);
            if (signedIn) patchMe.mutate({ language: next });
          }}
          options={[
            { value: "zh-Hant", label: m.settings_languageZh() },
            { value: "en", label: m.settings_languageEn() },
          ]}
        />
      </section>
      {signedIn ? (
        <section className="grid gap-2">
          <h2 className="m-0 text-base font-bold">{m.settings_account()}</h2>
          <Link className={ROW} to="/profile/edit">
            <PencilSimpleIcon className="size-5" aria-hidden="true" />
            {m.settings_editProfile()}
          </Link>
          <Button variant="secondary" onClick={() => setSignOutOpen(true)}>
            {m.settings_signOut()}
          </Button>
        </section>
      ) : null}
      <section className="grid gap-2">
        <h2 className="m-0 text-base font-bold">{m.settings_app()}</h2>
        <div className="glass-surface rounded-lg p-4 text-sm">{m.settings_glassPreview()}</div>
      </section>
      <ConfirmDialog
        open={signOutOpen}
        title={m.settings_signOut()}
        confirmLabel={m.common_signOut()}
        cancelLabel={m.common_back()}
        onOpenChange={setSignOutOpen}
        onConfirm={() => {
          signOut();
          setSignOutOpen(false);
          void navigate({ to: "/", replace: true });
        }}
      >
        {m.profile_signOutConfirm()}
      </ConfirmDialog>
    </main>
  );
}
