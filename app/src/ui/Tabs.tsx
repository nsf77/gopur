import type { ReactNode } from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { tabsContent, tabsList, tabsTrigger } from "./styles";

export function Tabs(props: {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string; content: ReactNode }[];
  "aria-label"?: string;
}) {
  return (
    <BaseTabs.Root value={props.value} onValueChange={props.onValueChange}>
      <BaseTabs.List className={tabsList()} aria-label={props["aria-label"]}>
        {props.items.map((item) => (
          <BaseTabs.Tab key={item.value} value={item.value} className={tabsTrigger()}>
            {item.label}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      {props.items.map((item) => (
        <BaseTabs.Panel key={item.value} value={item.value} className={tabsContent()}>
          {item.content}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}
