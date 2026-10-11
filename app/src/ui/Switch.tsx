import { Switch } from "@cloudflare/kumo/components/switch";

export function SwitchField(props: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return <Switch checked={props.checked} label={props.label} onCheckedChange={props.onCheckedChange} />;
}
