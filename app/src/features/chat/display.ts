import { A, O, pipe } from "../../lib/belt";
import { m } from "../../paraglide/messages.js";
import type { ChatMessage, Conversation } from "./types";

export function conversationTitle(conversation: Conversation, viewer: string): string {
  if (conversation.kind === "group") {
    const title = conversation.title?.trim();
    return title || m.chat_groupFallback();
  }
  const peer = pipe(
    conversation.members,
    A.find((member) => member.id !== viewer),
    O.toNullable,
  );
  return peer?.display_name?.trim() || peer?.username?.trim() || m.chat_title();
}

export function conversationPeer(conversation: Conversation, viewer: string) {
  return pipe(
    conversation.members,
    A.find((member) => member.id !== viewer),
    O.toNullable,
  );
}

export function lastMessagePreview(message: ChatMessage | null | undefined): string {
  if (!message) return "";
  if (message.unsent_at) return m.chat_unsent();
  if (message.kind === "photo") return m.chat_photo();
  if (message.kind === "event") {
    if (message.event?.title) return message.event.title;
    return message.event_hidden ? m.chat_eventUnavailable() : m.chat_event();
  }
  return message.body ?? "";
}
