import { OTPField, useOTPFieldContext } from "@kobalte/core/otp-field";
import { For, createUniqueId } from "solid-js";
import { otpInput, otpLabel, otpRoot, otpSlot, otpSlots } from "./styles";

export const OTP_LENGTH = 6;

const SLOT_INDEXES = [0, 1, 2, 3, 4, 5] as const;

function DigitSlots() {
  const otp = useOTPFieldContext();
  return (
    <div class={otpSlots()} aria-hidden="true">
      <For each={SLOT_INDEXES} keyed={(index) => index}>
        {(index) => {
          const active = () => otp.activeSlots().includes(index());
          const char = () => otp.value()[index()] ?? "";
          return <div class={otpSlot({ active: active() })}>{char()}</div>;
        }}
      </For>
    </div>
  );
}

export function OtpField(props: {
  value: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}) {
  const labelId = createUniqueId();
  return (
    <div class={otpRoot()}>
      <span id={labelId} class={otpLabel()}>
        {props.label}
      </span>
      <OTPField
        maxLength={OTP_LENGTH}
        value={props.value}
        name={props.name}
        disabled={props.disabled}
        required
        validationState={props.invalid ? "invalid" : undefined}
        onChange={props.onChange}
        onComplete={props.onComplete}
        aria-labelledby={labelId}
      >
        <OTPField.Input class={otpInput()} />
        <DigitSlots />
      </OTPField>
    </div>
  );
}
