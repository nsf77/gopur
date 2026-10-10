export type Tick = "pending" | "sent" | "delivered" | "read";

export type ConversationFolder = "inbox" | "requests";
export type ConversationKind = "dm" | "group";
export type MessageKind = "text" | "emoji" | "photo" | "event";

export type ChatEventCard = {
  id: string;
  title: string;
  start_at: string;
  cover_image_url?: string;
  cancelled?: boolean;
  host_user_id?: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: MessageKind;
  body?: string;
  image_url?: string;
  event_id?: string;
  event?: ChatEventCard;
  event_hidden?: boolean;
  reply_to?: string;
  reactions: { emoji: string; count: number; me: boolean; user_ids: string[] }[];
  created_at: string;
  unsent_at?: string;
  tick?: Tick;
};

export type ConversationMember = {
  id: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  role?: string;
  request_state?: string;
};

export type Conversation = {
  id: string;
  kind: ConversationKind;
  title?: string;
  photo_url?: string;
  folder: ConversationFolder;
  muted: boolean;
  role: string;
  request_state: string;
  unread_count: number;
  last_message?: ChatMessage | null;
  members: ConversationMember[];
  created_at: string;
  updated_at: string;
};

export type ChatEnvelope =
  | {
      type: "message";
      id: string;
      conversation_id: string;
      message_id: string;
      created_at: string;
      message: ChatMessage;
    }
  | {
      type: "receipt";
      id: string;
      conversation_id: string;
      message_id: string;
      created_at: string;
      status: "delivered" | "read";
      at: string;
    };
