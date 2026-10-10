import { Tabs as KobalteTabs } from "@kobalte/core/tabs";
import type { JSX } from "@solidjs/web";
import { For } from "solid-js";
import { tabsContent, tabsList, tabsTrigger } from "./styles";

export function Tabs(props: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string; content: JSX.Element }[];
  "aria-label"?: string;
}) {
  return (
    <KobalteTabs value={props.value} onChange={props.onChange}>
      <KobalteTabs.List class={tabsList()} aria-label={props["aria-label"]}>
        <For each={props.items} keyed={(item) => item.value}>
          {(item) => (
            <KobalteTabs.Trigger value={item().value} type="button" class={tabsTrigger()}>
              {item().label}
            </KobalteTabs.Trigger>
          )}
        </For>
      </KobalteTabs.List>
      <For each={props.items} keyed={(item) => item.value}>
        {(item) => (
          <KobalteTabs.Content value={item().value} class={tabsContent()}>
            {item().content}
          </KobalteTabs.Content>
        )}
      </For>
    </KobalteTabs>
  );
}
