import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { m } from "../../paraglide/messages.js";
import { useSessionStore, viewerId } from "../../stores/session";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { createDm, fetchConversations } from "./api";
import { conversationPeer, conversationTitle, lastMessagePreview } from "./display";
import type { ConversationFolder } from "./types";

export function ChatListPage() {
  const user = useSessionStore((s) => s.user);
  const router = useRouter();
  const [folder, setFolder] = useState<ConversationFolder>("inbox");
  const [peer, setPeer] = useState("");
  const [opening, setOpening] = useState(false);
  const list = useQuery({
    queryKey: ["chat", "list", folder, user?.id],
    queryFn: () => fetchConversations(folder),
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <View className="gap-4 p-4">
        <Text className="text-sm text-text-muted">{m.chat_signInRequired()}</Text>
        <Button label={m.common_signIn()} onPress={() => router.push("/login?next=/chat")} />
      </View>
    );
  }

  const rows = list.data?.conversations ?? [];

  return (
    <View className="flex-1 bg-bg">
      <View className="mt-2 flex-row gap-2 px-4">
        <TextInput
          className="min-h-11 flex-1 rounded-md border border-divider bg-surface px-3 text-sm text-text"
          placeholder={m.chat_newDmPlaceholder()}
          value={peer}
          onChangeText={setPeer}
        />
        <Button
          label={m.chat_open()}
          loading={opening}
          onPress={() => {
            const id = peer.trim();
            if (!id || opening) return;
            setOpening(true);
            void createDm(id)
              .then((conv) => router.push(`/chat/${conv.id}`))
              .finally(() => setOpening(false));
          }}
        />
      </View>
      <View className="flex-row gap-2 px-4 py-3">
        <Button
          variant={folder === "inbox" ? "primary" : "secondary"}
          label={m.chat_inbox()}
          onPress={() => setFolder("inbox")}
        />
        <Button
          variant={folder === "requests" ? "primary" : "secondary"}
          label={m.chat_requests()}
          onPress={() => setFolder("requests")}
        />
      </View>
      {list.isPending ? <Text className="p-4 text-sm text-text-muted">{m.common_loading()}</Text> : null}
      {list.isError ? <StatusMessage kind="error" message={m.chat_listError()} onRetry={() => void list.refetch()} /> : null}
      {list.isSuccess && rows.length === 0 ? <StatusMessage kind="empty" message={m.chat_empty()} /> : null}
      {rows.map((conv) => {
        const title = conversationTitle(conv, viewerId());
        const peerUser = conversationPeer(conv, viewerId());
        return (
          <Pressable
            key={conv.id}
            className="flex-row items-center gap-3 border-b border-divider px-4 py-3"
            onPress={() => router.push(`/chat/${conv.id}`)}
          >
            <Avatar name={title} src={peerUser?.avatar_url} />
            <View className="min-w-0 flex-1">
              <Text className="font-semibold text-text">{title}</Text>
              <Text className="text-sm text-text-muted" numberOfLines={1}>
                {lastMessagePreview(conv.last_message)}
              </Text>
            </View>
            {conv.unread_count > 0 ? (
              <View className="min-w-5 items-center rounded-full bg-accent px-1.5">
                <Text className="text-xs text-white">{conv.unread_count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
