import { WarningCircleIcon } from "@phosphor-icons/react";
import { Banner } from "@cloudflare/kumo/components/banner";
import { Empty } from "@cloudflare/kumo/components/empty";
import { m } from "../paraglide/messages.js";

export function StatusMessage(props: { kind: "empty" | "error"; message: string; onRetry?: () => void }) {
  if (props.kind === "error") {
    return (
      <div className="p-4">
        <Banner
          variant="error"
          icon={<WarningCircleIcon weight="fill" />}
          description={props.message}
          action={
            props.onRetry ? <Banner.Action onClick={props.onRetry}>{m.common_retry()}</Banner.Action> : undefined
          }
        />
      </div>
    );
  }
  return <Empty size="sm" className="p-4" title={props.message} />;
}
