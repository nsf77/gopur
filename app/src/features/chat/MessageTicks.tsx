import { CheckIcon, ChecksIcon, ClockIcon } from "@phosphor-icons/react";
import { cn } from "@cloudflare/kumo/utils";
import type { Tick } from "./types";

function tickClass(tone: "grey" | "blue"): string {
  return cn("size-3.5", tone === "blue" ? "text-accent" : "text-text-subtle");
}

export function MessageTicks(props: { tick?: Tick }) {
  const tick = props.tick ?? "sent";
  return (
    <span className="inline-flex" data-testid="message-ticks" aria-hidden="true">
      {tick === "pending" ? <ClockIcon className={tickClass("grey")} /> : null}
      {tick === "sent" ? <CheckIcon className={tickClass("grey")} /> : null}
      {tick === "delivered" ? <ChecksIcon className={tickClass("grey")} /> : null}
      {tick === "read" ? <ChecksIcon className={tickClass("blue")} /> : null}
    </span>
  );
}
