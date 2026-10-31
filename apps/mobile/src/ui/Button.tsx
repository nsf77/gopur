import { ActivityIndicator, Pressable, Text } from "react-native";

type Variant = "primary" | "secondary" | "ghost";

export function Button(props: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  testID?: string;
}) {
  const variant = props.variant ?? "primary";
  const bg =
    variant === "primary" ? "bg-accent" : variant === "secondary" ? "bg-surface-elevated border border-divider" : "";
  const color = variant === "primary" ? "text-white" : "text-text";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled || props.loading}
      onPress={props.onPress}
      testID={props.testID}
      className={`min-h-11 items-center justify-center rounded-xl px-4 ${bg} ${props.disabled ? "opacity-50" : ""}`}
    >
      {props.loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#304385"} />
      ) : (
        <Text className={`text-sm font-semibold ${color}`}>{props.label}</Text>
      )}
    </Pressable>
  );
}
