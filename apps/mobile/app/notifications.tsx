import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { O } from "@gopur/shared";
import { notificationsFromPages, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../src/lib/queries";
import { notificationHref } from "../src/features/notifications/links";
import { NotificationRow } from "../src/features/notifications/NotificationRow";
import { AuthPrompt } from "../src/features/auth/AuthPrompt";
import { Button } from "../src/ui/Button";
import { Screen } from "../src/ui/Screen";
import { StatusMessage } from "../src/ui/StatusMessage";
import { m } from "../src/paraglide/messages.js";
import { isSignedIn } from "../src/stores/session";

export default function NotificationsScreen() {
  const router = useRouter();
  const signedIn = isSignedIn();
  const list = useNotifications(signedIn);
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const items = notificationsFromPages(list.data?.pages);

  if (!signedIn) {
    return (
      <Screen>
        <AuthPrompt next="/notifications" message={m.notifications_signIn()} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void list.refetch()} refreshing={list.isRefetching}>
      <Text className="px-4 pt-2 text-2xl font-extrabold text-text">{m.notifications_title()}</Text>
      <Text className="px-4 py-2">
        <Button variant="secondary" label={m.notifications_markAll()} onPress={() => markAll.mutate()} />
      </Text>
      {list.isError ? <StatusMessage kind="error" message={m.common_error()} onRetry={() => void list.refetch()} /> : null}
      {list.isSuccess && items.length === 0 ? <StatusMessage kind="empty" message={m.notifications_empty()} /> : null}
      <View className="px-4">
        {items.map((item) => (
          <NotificationRow
            key={item.id}
            item={item}
            onSelect={() => {
              markOne.mutate(item.id);
              const href = O.toNullable(notificationHref(item));
              if (href) router.push(href);
            }}
          />
        ))}
      </View>
    </Screen>
  );
}
