import { Switch as ArkSwitch } from "@ark-ui/solid/switch";

export function SwitchField(props: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <ArkSwitch.Root
      checked={props.checked}
      onCheckedChange={(d) => props.onChange(d.checked)}
      render={(root) => (
        <label {...root({ class: "flex min-h-11 items-center gap-3" })}>
          <ArkSwitch.Control
            render={(control) => (
              <span
                {...control({
                  class:
                    "relative inline-flex h-7 w-11 items-center rounded-pill bg-surface-pressed data-[state=checked]:bg-accent",
                })}
              >
                <ArkSwitch.Thumb
                  render={(thumb) => (
                    <span
                      {...thumb({
                        class:
                          "size-5 translate-x-1 rounded-full bg-white transition-transform data-[state=checked]:translate-x-5",
                      })}
                    />
                  )}
                />
              </span>
            )}
          />
          <ArkSwitch.Label render={(label) => <span {...label({ class: "text-sm font-medium" })}>{props.label}</span>} />
          <ArkSwitch.HiddenInput />
        </label>
      )}
    />
  );
}
