import { Switch } from "@cloudflare/kumo/components/switch";

export function SwitchField(props: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Switch
      checked={props.checked}
      label={props.label}
      disabled={props.disabled}
      onCheckedChange={props.onCheckedChange}
    />
  );
}
