import { RadioGroup as ArkRadio } from "@ark-ui/solid/radio-group";
import { For } from "solid-js";

export function RadioGroup<T extends string>(props: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  "aria-label"?: string;
}) {
  return (
    <ArkRadio.Root
      name={props.name}
      value={props.value}
      onValueChange={(d) => {
        if (d.value) props.onChange(d.value as T);
      }}
      render={(root) => (
        <div {...root({})}>
          <ArkRadio.Label render={(label) => <span {...label({ class: "sr-only" })}>{props["aria-label"]}</span>} />
          <div class="grid gap-1">
            <For each={props.options}>
              {(opt) => (
                <ArkRadio.Item
                  value={opt.value}
                  render={(item) => (
                    <label {...item({ class: "flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-surface-elevated" })}>
                      <ArkRadio.ItemControl
                        render={(control) => (
                          <div
                            {...control({
                              class:
                                "size-4 rounded-full border border-divider data-[state=checked]:border-accent data-[state=checked]:bg-accent",
                            })}
                          />
                        )}
                      />
                      <ArkRadio.ItemText render={(text) => <span {...text({ class: "text-sm font-medium" })}>{opt.label}</span>} />
                      <ArkRadio.ItemHiddenInput />
                    </label>
                  )}
                />
              )}
            </For>
          </div>
        </div>
      )}
    />
  );
}
