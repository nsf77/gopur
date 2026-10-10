import { RadioGroup as KobalteRadio } from "@kobalte/core/radio-group";
import { For } from "solid-js";

export function RadioGroup<T extends string>(props: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  "aria-label"?: string;
}) {
  return (
    <KobalteRadio
      name={props.name}
      value={props.value}
      onChange={(value) => {
        if (value) props.onChange(value as T);
      }}
      aria-label={props["aria-label"]}
    >
      <KobalteRadio.Label class="sr-only">{props["aria-label"]}</KobalteRadio.Label>
      <div class="grid gap-1">
        <For each={props.options} keyed={(opt) => opt.value}>
          {(opt) => (
            <KobalteRadio.Item
              value={opt().value}
              class="flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-surface-elevated"
            >
              <KobalteRadio.ItemInput />
              <KobalteRadio.ItemControl class="size-4 rounded-full border border-divider ui-checked:border-accent ui-checked:bg-accent" />
              <KobalteRadio.ItemLabel class="text-sm font-medium">{opt().label}</KobalteRadio.ItemLabel>
            </KobalteRadio.Item>
          )}
        </For>
      </div>
    </KobalteRadio>
  );
}
