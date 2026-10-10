import { RadioGroup as KobalteRadio } from "@kobalte/core/radio-group";
import { For } from "solid-js";
import { radioControl, radioItem, radioItemLabel, radioLabel, radioOptions } from "./styles";

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
      <KobalteRadio.Label class={radioLabel()}>{props["aria-label"]}</KobalteRadio.Label>
      <div class={radioOptions()}>
        <For each={props.options} keyed={(opt) => opt.value}>
          {(opt) => (
            <KobalteRadio.Item value={opt().value} class={radioItem()}>
              <KobalteRadio.ItemInput />
              <KobalteRadio.ItemControl class={radioControl()} />
              <KobalteRadio.ItemLabel class={radioItemLabel()}>{opt().label}</KobalteRadio.ItemLabel>
            </KobalteRadio.Item>
          )}
        </For>
      </div>
    </KobalteRadio>
  );
}
