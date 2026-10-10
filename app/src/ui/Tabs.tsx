import { Tabs as KobalteTabs } from "@kobalte/core/tabs";
import type { JSX } from "@solidjs/web";
import { For } from "solid-js";

export function Tabs(props: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string; content: JSX.Element }[];
  "aria-label"?: string;
}) {
  return (
    <KobalteTabs value={props.value} onChange={props.onChange}>
      <KobalteTabs.List class="flex gap-1 px-4" aria-label={props["aria-label"]}>
        <For each={props.items} keyed={(item) => item.value}>
          {(item) => (
            <KobalteTabs.Trigger
              value={item().value}
              type="button"
              class="min-h-11 rounded-pill px-3 text-sm font-semibold text-text-muted ui-selected:bg-accent-subtle ui-selected:text-accent"
            >
              {item().label}
            </KobalteTabs.Trigger>
          )}
        </For>
      </KobalteTabs.List>
      <For each={props.items} keyed={(item) => item.value}>
        {(item) => (
          <KobalteTabs.Content value={item().value} class="pt-2">
            {item().content}
          </KobalteTabs.Content>
        )}
      </For>
    </KobalteTabs>
  );
}
