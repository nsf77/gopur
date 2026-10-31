import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { m } from "../../paraglide/messages.js";
import { useSessionStore, viewerId } from "../../stores/session";
import { Button } from "../../ui/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { fetchConversation, fetchMessages, sendMessage } from "./api";
import { conversationTitle } from "./display";

export function ThreadPage(props: { id: string }) {
  const user = useSessionStore((s) => s.user);
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const conv = useQuery({
    queryKey: ["chat", "conv", props.id],
    queryFn: () => fetchConversation(props.id),
    enabled: Boolean(user),
  });
  const messages = useQuery({
    queryKey: ["chat", "messages", props.id],
    queryFn: () => fetchMessages(props.id),
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <View className="gap-4 p-4">
        <Text className="text-sm text-text-muted">{m.chat_signInRequired()}</Text>
        <Button label={m.common_signIn()} onPress={() => router.push(`/login?next=/chat/${props.id}`)} />
      </View>
    );
  }

  if (conv.isError || messages.isError) {
    return <StatusMessage kind="error" message={m.chat_threadError()} onRetry={() => void messages.refetch()} />;
  }

  const title = conv.data ? conversationTitle(conv.data, viewerId()) : m.chat_title();
  const rows = messages.data?.messages ?? [];

  return (
    <View className="flex-1 bg-bg">
      <Text className="px-4 py-3 text-lg font-bold text-text">{title}</Text>
      {messages.isPending ? <Text className="p-4 text-sm text-text-muted">{m.common_loading()}</Text> : null}
      {rows.map((item) => {
        const mine = item.sender_id === viewerId();
        return (
          <View key={item.id} className={`px-4 py-1 ${mine ? "items-end" : "items-start"}`}>
            <View className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-accent" : "bg-surface-elevated"}`}>
              <Text className={mine ? "text-white" : "text-text"}>{item.body ?? item.kind}</Text>
            </View>
          </View>
        );
      })}
      {conv.data?.request_state === "pending" ? (
        <Text className="px-4 py-2 text-sm text-text-muted">{m.chat_requestPending()}</Text>
      ) : (
        <View className="flex-row gap-2 px-4 py-3">
          <TextInput
            className="min-h-11 flex-1 rounded-md border border-divider bg-surface px-3 text-sm text-text"
            placeholder={m.chat_messagePlaceholder()}
            value={draft}
            onChangeText={setDraft}
          />
          <Pressable
            className="min-h-11 justify-center rounded-xl bg-accent px-3"
            onPress={() => {
              const body = draft.trim();
              if (!body) return;
              void sendMessage(props.id, { kind: "text", body }).then(() => {
                setDraft("");
                void messages.refetch();
              });
            }}
          >
            <Text className="font-semibold text-white">{m.chat_send()}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
