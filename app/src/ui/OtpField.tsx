import { OTPField } from "@cloudflare/kumo/primitives/otp-field";
import { cn } from "@cloudflare/kumo/utils";

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
    <div className="grid gap-1">
      <span className="text-sm font-medium text-kumo-default">{props.label}</span>
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
        <div className="flex gap-2">
          {Array.from({ length: OTP_LENGTH }, (_, index) => (
            <OTPField.Input
              key={index}
              className={cn(
                "flex size-11 items-center justify-center rounded-md border bg-kumo-base text-center text-lg font-semibold tabular-nums text-kumo-default outline-none data-focused:border-kumo-brand",
                props.invalid ? "border-kumo-danger" : "border-kumo-line",
              )}
              aria-invalid={props.invalid || undefined}
              aria-label={index === 0 ? props.label : `Character ${index + 1} of ${OTP_LENGTH}`}
            />
          ))}
        </div>
      </OTPField.Root>
    </div>
  );
}
