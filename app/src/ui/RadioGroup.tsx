import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { radioControl, radioGroup, radioIndicator, radioRow } from "./styles";

export function RadioGroup(props: {
  value: string;
  name?: string;
  "aria-label"?: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
}) {
  return (
    <BaseRadioGroup
      value={props.value}
      name={props.name}
      aria-label={props["aria-label"]}
      onValueChange={(value) => {
        if (typeof value === "string") props.onValueChange(value);
      }}
      className={radioGroup()}
    >
      {props.options.map((option) => (
        <label key={option.value} className={radioRow()}>
          <Radio.Root value={option.value} className={radioControl()}>
            <Radio.Indicator className={radioIndicator()} />
          </Radio.Root>
          {option.label}
        </label>
      ))}
    </BaseRadioGroup>
  );
}
