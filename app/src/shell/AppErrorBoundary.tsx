import { Errored, type ParentProps } from "solid-js";
import { t } from "../lib/i18n";

export function AppErrorBoundary(props: ParentProps) {
  return (
    <Errored
      fallback={(error, reset) => (
        <main class="p-4">
          <p>{t("common.error")}</p>
          <p class="text-xs text-text-muted">{String(error())}</p>
          <button type="button" class="mt-3 font-semibold text-accent" onClick={() => reset()}>
            {t("common.retry")}
          </button>
        </main>
      )}
    >
      {props.children}
    </Errored>
  );
}
