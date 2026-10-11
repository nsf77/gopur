import { Switch } from "@base-ui/react/switch";
import { switchControl, switchLabel, switchRoot, switchThumb } from "./styles";

export function SwitchField(props: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className={switchRoot()}>
      <Switch.Root checked={props.checked} onCheckedChange={props.onCheckedChange} className={switchControl()}>
        <Switch.Thumb className={switchThumb()} />
      </Switch.Root>
      <span className={switchLabel()}>{props.label}</span>
    </label>
  );
}
