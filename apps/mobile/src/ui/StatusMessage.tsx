import { Text, View } from "react-native";
import { Button } from "./Button";

export function StatusMessage(props: { kind: "error" | "empty"; message: string; onRetry?: () => void }) {
  return (
    <View className="items-center gap-3 px-4 py-8">
      <Text className="text-center text-sm text-text-muted">{props.message}</Text>
      {props.kind === "error" && props.onRetry ? <Button label="Retry" variant="secondary" onPress={props.onRetry} /> : null}
    </View>
  );
}
