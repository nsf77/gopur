import { Show } from "solid-js";
import { t } from "../lib/i18n";

export function StatusMessage(props: { kind: "empty" | "error"; message: string; onRetry?: () => void }) {
  return (
    <div class="grid gap-2 p-4 text-sm text-text-muted">
      <p class="m-0">{props.message}</p>
      <Show when={props.onRetry}>
        <button type="button" class="text-left font-semibold text-accent" onClick={props.onRetry}>
          {t("common.retry")}
        </button>
      </Show>
    </div>
  );
}
