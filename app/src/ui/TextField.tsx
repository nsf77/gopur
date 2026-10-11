import type { HTMLAttributes, HTMLInputTypeAttribute } from "react";
import { Input, Textarea } from "@cloudflare/kumo/components/input";

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
    <Input
      name={props.name}
      label={props.label}
      type={props.type ?? "text"}
      inputMode={props.inputMode}
      autoComplete={props.autoComplete}
      placeholder={props.placeholder}
      required={props.required}
      value={props.value}
      disabled={props.disabled}
      error={props.error}
      variant={props.invalid ? "error" : "default"}
      onValueChange={props.onValueChange}
    />
  );
}

export function TextAreaField(props: {
  label: string;
  value: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  error?: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Textarea
      name={props.name}
      label={props.label}
      value={props.value}
      disabled={props.disabled}
      error={props.error}
      variant={props.invalid ? "error" : "default"}
      autoResize
      minRows={3}
      onValueChange={props.onValueChange}
    />
  );
}
