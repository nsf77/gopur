import { useState } from "react";
import { getLocale, setLocale } from "../paraglide/runtime.js";
import { m } from "../paraglide/messages.js";
import { ConfirmDialog } from "../ui/Dialog";
import { SwitchField } from "../ui/Switch";
import { Button } from "../ui/Button";

export function SettingsPage() {
  const locale = getLocale();
  const [preview, setPreview] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <main className="grid gap-4 p-4">
      <section className="grid gap-2">
        <h2 className="m-0 text-sm font-semibold">{m.settings_language()}</h2>
        <div className="flex gap-2">
          <Button variant={locale === "en" ? "primary" : "secondary"} onClick={() => setLocale("en")}>
            {m.settings_languageEn()}
          </Button>
          <Button variant={locale === "zh-Hant" ? "primary" : "secondary"} onClick={() => setLocale("zh-Hant")}>
            {m.settings_languageZh()}
          </Button>
        </div>
      </section>
      <SwitchField checked={preview} label={m.settings_glassPreview()} onCheckedChange={setPreview} />
      {preview ? <div className="glass-surface rounded-lg p-4 text-sm">{m.settings_glassPreview()}</div> : null}
      <Button variant="secondary" onClick={() => setDialogOpen(true)}>
        Kumo
      </Button>
      <ConfirmDialog
        open={dialogOpen}
        title="Kumo"
        confirmLabel={m.common_done()}
        cancelLabel={m.common_back()}
        onOpenChange={setDialogOpen}
        onConfirm={() => setDialogOpen(false)}
      >
        Dialog / switch / tabs / OTP use Cloudflare Kumo.
      </ConfirmDialog>
    </main>
  );
}
