import { Switch } from "@kobalte/core/switch";

export function SwitchField(props: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Switch checked={props.checked} onChange={props.onChange} class="flex min-h-11 items-center gap-3">
      <Switch.Input />
      <Switch.Control class="relative inline-flex h-7 w-11 items-center rounded-pill bg-surface-pressed ui-checked:bg-accent">
        <Switch.Thumb class="size-5 translate-x-1 rounded-full bg-white transition-transform ui-checked:translate-x-5" />
      </Switch.Control>
      <Switch.Label class="text-sm font-medium">{props.label}</Switch.Label>
    </Switch>
  );
}
