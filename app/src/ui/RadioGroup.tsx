import { Radio } from "@cloudflare/kumo/components/radio";

export function RadioGroup(props: {
  value: string;
  name?: string;
  "aria-label"?: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
}) {
  return (
    <Radio.Group
      name={props.name}
      value={props.value}
      legend={props["aria-label"]}
      onValueChange={props.onValueChange}
    >
      {props.options.map((option) => (
        <Radio.Item key={option.value} value={option.value} label={option.label} />
      ))}
    </Radio.Group>
  );
}
