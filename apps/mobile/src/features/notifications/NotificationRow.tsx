import { Pressable, Text, View } from "react-native";
import { formatEventWhen } from "@gopur/shared";
import type { Notification } from "@gopur/shared";
import { getLocale } from "../../paraglide/runtime.js";

export function NotificationRow(props: { item: Notification; onSelect: () => void }) {
  const loc = getLocale();
  return (
    <Pressable
      onPress={props.onSelect}
      className={`mb-3 flex-row gap-3 rounded-2xl border px-4 py-3 ${
        props.item.read ? "border-divider bg-surface-elevated" : "border-accent/30 bg-accent/10"
      }`}
    >
      <View className="min-w-0 flex-1">
        <Text className="font-semibold text-text">{props.item.title}</Text>
        <Text className="mt-1 text-sm text-text-muted">{props.item.body}</Text>
        <Text className="mt-2 text-xs text-text-muted">{formatEventWhen(props.item.created_at, loc)}</Text>
      </View>
      {props.item.read ? null : <View className="mt-2 size-2 rounded-full bg-accent" />}
    </Pressable>
  );
}
