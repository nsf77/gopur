import type { ReactNode } from "react";
import { Tabs as KumoTabs } from "@cloudflare/kumo/components/tabs";

export function Tabs(props: {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string; content: ReactNode }[];
  "aria-label"?: string;
}) {
  const active = props.items.find((item) => item.value === props.value) ?? props.items[0];
  return (
    <div aria-label={props["aria-label"]}>
      <KumoTabs
        variant="segmented"
        value={props.value}
        onValueChange={props.onValueChange}
        className="px-4"
        tabs={props.items.map((item) => ({ value: item.value, label: item.label }))}
      />
      <div className="pt-2">{active?.content}</div>
    </div>
  );
}
