import { OTPField, useOTPFieldContext } from "@kobalte/core/otp-field";
import { For, createUniqueId } from "solid-js";

export const OTP_LENGTH = 6;

const SLOT_INDEXES = [0, 1, 2, 3, 4, 5] as const;

function DigitSlots() {
  const otp = useOTPFieldContext();
  return (
    <div class="flex gap-2" aria-hidden="true">
      <For each={SLOT_INDEXES} keyed={(index) => index}>
        {(index) => {
          const active = () => otp.activeSlots().includes(index());
          const char = () => otp.value()[index()] ?? "";
          return (
            <div
              class={`flex size-11 items-center justify-center rounded-md border bg-surface text-lg font-semibold tabular-nums ${
                active() ? "border-accent" : "border-divider"
              }`}
            >
              {char()}
            </div>
          );
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
    <div class="grid gap-1">
      <span id={labelId} class="text-sm font-medium">
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
        <OTPField.Input class="z-10" />
        <DigitSlots />
      </OTPField>
    </div>
  );
}
