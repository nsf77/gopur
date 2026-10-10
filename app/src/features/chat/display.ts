import { A, O, pipe } from "@mobily/ts-belt";
import type { ChatMessage, Conversation } from "./types";

export function conversationTitle(conversation: Conversation, viewerId: string): string {
  if (conversation.kind === "group") {
    const title = conversation.title?.trim();
    return title || "Group";
  }
  const peer = pipe(
    conversation.members,
    A.find((member) => member.id !== viewerId),
    O.toNullable,
  );
  return peer?.display_name?.trim() || peer?.username?.trim() || "Chat";
}

export function lastMessagePreview(message: ChatMessage | null | undefined): string {
  if (!message) return "";
  if (message.unsent_at) return "Message unsent";
  if (message.kind === "photo") return "Photo";
  if (message.kind === "event") {
    if (message.event?.title) return message.event.title;
    return message.event_hidden ? "Event unavailable" : "Event";
  }
  return message.body ?? "";
}
