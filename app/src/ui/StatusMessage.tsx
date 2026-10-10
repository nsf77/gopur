import { Show } from "solid-js";
import { t } from "../lib/i18n";
import { statusMessage } from "./styles";

export function StatusMessage(props: { kind: "empty" | "error"; message: string; onRetry?: () => void }) {
  return (
    <div class={statusMessage({ kind: props.kind })}>
      <p class="m-0">{props.message}</p>
      <Show when={props.onRetry}>
        <button type="button" class="text-left font-semibold text-accent" onClick={props.onRetry}>
          {t("common.retry")}
        </button>
      </Show>
    </div>
  );
}
