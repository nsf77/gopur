import { Tabs as ArkTabs } from "@ark-ui/solid/tabs";
import type { JSX } from "@solidjs/web";
import { For } from "solid-js";

export function Tabs(props: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string; content: JSX.Element }[];
  "aria-label"?: string;
}) {
  return (
    <ArkTabs.Root
      value={props.value}
      onValueChange={(d) => props.onChange(d.value ?? props.value)}
      render={(root) => (
        <div {...root({})}>
          <ArkTabs.List
            render={(list) => (
              <div {...list({ class: "flex gap-1 px-4", "aria-label": props["aria-label"] })}>
                <For each={props.items}>
                  {(item) => (
                    <ArkTabs.Trigger
                      value={item.value}
                      render={(trigger) => (
                        <button
                          {...trigger({
                            type: "button",
                            class:
                              "min-h-11 rounded-pill px-3 text-sm font-semibold text-text-muted data-[selected]:bg-accent-subtle data-[selected]:text-accent",
                          })}
                        >
                          {item.label}
                        </button>
                      )}
                    />
                  )}
                </For>
              </div>
            )}
          />
          <For each={props.items}>
            {(item) => (
              <ArkTabs.Content
                value={item.value}
                render={(content) => <div {...content({ class: "pt-2" })}>{item.content}</div>}
              />
            )}
          </For>
        </div>
      )}
    />
  );
}
