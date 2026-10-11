import type { HTMLAttributes, HTMLInputTypeAttribute } from "react";
import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { fieldError, fieldLabel, fieldRoot, textInput } from "./styles";

export function TextField(props: {
  label: string;
  value: string;
  name?: string;
  type?: HTMLInputTypeAttribute;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  error?: string;
  required?: boolean;
  onValueChange: (value: string) => void;
}) {
  return (
    <Field.Root name={props.name} disabled={props.disabled} invalid={props.invalid} className={fieldRoot()}>
      <Field.Label className={fieldLabel()}>{props.label}</Field.Label>
      <Input
        className={textInput({ invalid: Boolean(props.invalid) })}
        type={props.type ?? "text"}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        required={props.required}
        value={props.value}
        disabled={props.disabled}
        onValueChange={props.onValueChange}
      />
      {props.error ? <Field.Error className={fieldError()}>{props.error}</Field.Error> : null}
    </Field.Root>
  );
}
