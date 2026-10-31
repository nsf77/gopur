import * as v from "valibot";
import type { ChatEnvelope, ChatMessage, Conversation } from "./types";

const ChatReaction = v.object({
  emoji: v.string(),
  count: v.number(),
  me: v.boolean(),
  user_ids: v.array(v.string()),
});

const ChatEventCard = v.object({
  id: v.string(),
  title: v.string(),
  start_at: v.string(),
  cover_image_url: v.optional(v.string()),
  cancelled: v.optional(v.boolean()),
  host_user_id: v.optional(v.string()),
});

export const ChatMessageSchema = v.object({
  id: v.string(),
  conversation_id: v.string(),
  sender_id: v.string(),
  kind: v.string(),
  reactions: v.optional(v.array(ChatReaction)),
  created_at: v.string(),
  body: v.optional(v.string()),
  image_url: v.optional(v.string()),
  event_id: v.optional(v.string()),
  event: v.optional(ChatEventCard),
  event_hidden: v.optional(v.boolean()),
  reply_to: v.optional(v.string()),
  unsent_at: v.optional(v.string()),
});

const ConversationMember = v.object({
  id: v.string(),
  display_name: v.optional(v.string()),
  username: v.optional(v.string()),
  avatar_url: v.optional(v.string()),
  role: v.optional(v.string()),
  request_state: v.optional(v.string()),
});

export const ConversationSchema = v.object({
  id: v.string(),
  kind: v.string(),
  title: v.optional(v.string()),
  photo_url: v.optional(v.string()),
  folder: v.string(),
  muted: v.boolean(),
  role: v.string(),
  request_state: v.string(),
  unread_count: v.number(),
  last_message: v.optional(v.nullable(ChatMessageSchema)),
  members: v.optional(v.array(ConversationMember)),
  created_at: v.string(),
  updated_at: v.string(),
});

export const ConversationListSchema = v.object({
  conversations: v.array(ConversationSchema),
  next_cursor: v.optional(v.string()),
});

export const MessageListSchema = v.object({
  messages: v.array(ChatMessageSchema),
  next_before: v.optional(v.string()),
  next_after: v.optional(v.string()),
});

export const ChatEnvelopeSchema = v.object({
  id: v.string(),
  type: v.string(),
  conversation_id: v.string(),
  message_id: v.string(),
  created_at: v.string(),
  message: v.optional(ChatMessageSchema),
  status: v.optional(v.string()),
  at: v.optional(v.string()),
});

export const PendingEnvelopesSchema = v.object({
  envelopes: v.optional(v.array(ChatEnvelopeSchema)),
});

export const DeviceRegisteredSchema = v.object({
  device_id: v.string(),
  user_id: v.string(),
  last_seen_at: v.string(),
});

function asMessage(data: v.InferOutput<typeof ChatMessageSchema>): ChatMessage {
  return { ...data, reactions: data.reactions ?? [] };
}

function asConversation(data: v.InferOutput<typeof ConversationSchema>): Conversation {
  return {
    ...data,
    members: data.members ?? [],
    last_message: data.last_message ? asMessage(data.last_message) : data.last_message,
  };
}

export function parseConversation(data: unknown): Conversation {
  return asConversation(v.parse(ConversationSchema, data));
}

export function parseConversationList(data: unknown): {
  conversations: Conversation[];
  next_cursor?: string;
} {
  const parsed = v.parse(ConversationListSchema, data);
  return {
    conversations: parsed.conversations.map(asConversation),
    next_cursor: parsed.next_cursor,
  };
}

export function parseMessageList(data: unknown): {
  messages: ChatMessage[];
  next_before?: string;
  next_after?: string;
} {
  const parsed = v.parse(MessageListSchema, data);
  return {
    messages: parsed.messages.map(asMessage),
    next_before: parsed.next_before,
    next_after: parsed.next_after,
  };
}

export function parseChatMessage(data: unknown): ChatMessage {
  return asMessage(v.parse(ChatMessageSchema, data));
}

export function parsePendingEnvelopes(data: unknown): { envelopes: ChatEnvelope[] } {
  const parsed = v.parse(PendingEnvelopesSchema, data);
  const envelopes: ChatEnvelope[] = [];
  for (const raw of parsed.envelopes ?? []) {
    const envelope = asChatEnvelope(raw);
    if (envelope) envelopes.push(envelope);
  }
  return { envelopes };
}

export function asChatEnvelope(raw: unknown): ChatEnvelope | null {
  const parsed = v.safeParse(ChatEnvelopeSchema, raw);
  if (!parsed.success) return null;
  const frame = parsed.output;
  if (frame.type === "message" && frame.message) {
    return {
      type: "message",
      id: frame.id,
      conversation_id: frame.conversation_id,
      message_id: frame.message_id,
      created_at: frame.created_at,
      message: asMessage(frame.message),
    };
  }
  if (frame.type === "receipt" && (frame.status === "delivered" || frame.status === "read")) {
    return {
      type: "receipt",
      id: frame.id,
      conversation_id: frame.conversation_id,
      message_id: frame.message_id,
      created_at: frame.created_at,
      status: frame.status,
      at: frame.at ?? "",
    };
  }
  return null;
}
