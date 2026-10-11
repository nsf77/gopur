import { OTPField } from "@base-ui/react/otp-field";
import { otpInput, otpLabel, otpRoot, otpSlots } from "./styles";

export const OTP_LENGTH = 6;

export function OtpField(props: {
  value?: string;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
  name?: string;
  onValueChange?: (value: string) => void;
  onValueComplete?: (value: string) => void;
}) {
  return (
    <div className={otpRoot()}>
      <span className={otpLabel()}>{props.label}</span>
      <OTPField.Root
        length={OTP_LENGTH}
        name={props.name}
        value={props.value}
        disabled={props.disabled}
        validationType="numeric"
        autoComplete="one-time-code"
        onValueChange={(value) => props.onValueChange?.(value)}
        onValueComplete={(value) => props.onValueComplete?.(value)}
      >
        <div className={otpSlots()}>
          {Array.from({ length: OTP_LENGTH }, (_, index) => (
            <OTPField.Input
              key={index}
              className={otpInput({ invalid: Boolean(props.invalid) })}
              aria-invalid={props.invalid || undefined}
              aria-label={index === 0 ? props.label : `Character ${index + 1} of ${OTP_LENGTH}`}
            />
          ))}
        </div>
      </OTPField.Root>
    </div>
  );
}
