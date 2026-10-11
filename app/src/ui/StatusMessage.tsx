import { m } from "../paraglide/messages.js";
import { statusMessage } from "./styles";

export function StatusMessage(props: { kind: "empty" | "error"; message: string; onRetry?: () => void }) {
  return (
    <div className={statusMessage({ kind: props.kind })}>
      <p className="m-0">{props.message}</p>
      {props.onRetry ? (
        <button type="button" className="text-left font-semibold text-accent" onClick={props.onRetry}>
          {m.common_retry()}
        </button>
      ) : null}
    </div>
  );
}
