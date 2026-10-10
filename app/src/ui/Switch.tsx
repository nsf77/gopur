import { Switch } from "@kobalte/core/switch";
import { switchControl, switchLabel, switchRoot, switchThumb } from "./styles";

export function SwitchField(props: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Switch checked={props.checked} onChange={props.onChange} class={switchRoot()}>
      <Switch.Input />
      <Switch.Control class={switchControl()}>
        <Switch.Thumb class={switchThumb()} />
      </Switch.Control>
      <Switch.Label class={switchLabel()}>{props.label}</Switch.Label>
    </Switch>
  );
}
