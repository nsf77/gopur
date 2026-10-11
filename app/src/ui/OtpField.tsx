import { OTPField } from "@base-ui/react/otp-field";
import { otpInput, otpLabel, otpRoot, otpSlots } from "./styles";

export const OTP_LENGTH = 6;

export function OtpField(props: {
  value?: string;
  disabled?: boolean;
  label: string;
  onValueComplete?: (value: string) => void;
}) {
  return (
    <div className={otpRoot()}>
      <span className={otpLabel()}>{props.label}</span>
      <OTPField.Root
        length={OTP_LENGTH}
        value={props.value}
        disabled={props.disabled}
        validationType="numeric"
        onValueComplete={(value) => props.onValueComplete?.(value)}
      >
        <div className={otpSlots()}>
          {Array.from({ length: OTP_LENGTH }, (_, index) => (
            <OTPField.Input
              key={index}
              className={otpInput()}
              aria-label={index === 0 ? props.label : `Character ${index + 1} of ${OTP_LENGTH}`}
            />
          ))}
        </div>
      </OTPField.Root>
    </div>
  );
}
