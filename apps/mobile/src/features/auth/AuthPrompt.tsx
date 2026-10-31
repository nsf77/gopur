import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../ui/Button";
import { m } from "../../paraglide/messages.js";

export function AuthPrompt(props: { next: string; message: string }) {
  const router = useRouter();
  return (
    <View className="gap-3 px-4 py-6">
      <Text className="text-sm text-text-muted">{props.message}</Text>
      <Button
        label={m.common_signIn()}
        onPress={() => router.push(`/login?next=${encodeURIComponent(props.next)}`)}
      />
    </View>
  );
}
