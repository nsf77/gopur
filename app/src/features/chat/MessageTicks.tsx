import { Check, CheckCheck, Clock } from "lucide-react";
import { chatTickIcon } from "../../ui/styles";
import type { Tick } from "./types";

export function MessageTicks(props: { tick?: Tick }) {
  const tick = props.tick ?? "sent";
  return (
    <span className="inline-flex" data-testid="message-ticks" aria-hidden="true">
      {tick === "pending" ? <Clock className={chatTickIcon({ tone: "grey" })} /> : null}
      {tick === "sent" ? <Check className={chatTickIcon({ tone: "grey" })} /> : null}
      {tick === "delivered" ? <CheckCheck className={chatTickIcon({ tone: "grey" })} /> : null}
      {tick === "read" ? <CheckCheck className={chatTickIcon({ tone: "blue" })} /> : null}
    </span>
  );
}
