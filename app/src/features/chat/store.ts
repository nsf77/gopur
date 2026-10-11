import { applyTick } from "./ticks";
import type { ChatMessage, Conversation, Tick } from "./types";

export type StoredMessage = ChatMessage & { tick?: Tick };

export type OutboxItem = {
  id: string;
  conversation_id: string;
  sender_id?: string;
  kind: "text" | "emoji" | "photo" | "event";
  body?: string;
  image_url?: string;
  event_id?: string;
  reply_to?: string;
  created_at: string;
};

type ConvState = {
  id: string;
  last_message?: StoredMessage;
  unread_count: number;
  updated_at: string;
};

const DB_VERSION = 1;
const openDbs = new Map<string, IDBDatabase>();
const listeners = new Set<() => void>();
let generation = 0;

function dbName(userId: string): string {
  return `gopur-chat:${userId}`;
}

function notify(): void {
  generation += 1;
  for (const fn of listeners) fn();
}

export function chatStoreGeneration(): number {
  return generation;
}

export function subscribeChatStore(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function openDb(userId: string): Promise<IDBDatabase> {
  const cached = openDbs.get(userId);
  if (cached) return cached;
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName(userId), DB_VERSION);
    request.onupgradeneeded = () => {
      const next = request.result;
      if (!next.objectStoreNames.contains("kv")) next.createObjectStore("kv");
      if (!next.objectStoreNames.contains("messages")) {
        const messages = next.createObjectStore("messages", { keyPath: "id" });
        messages.createIndex("by_conversation", "conversation_id", { unique: false });
      }
      if (!next.objectStoreNames.contains("conversations")) {
        next.createObjectStore("conversations", { keyPath: "id" });
      }
      if (!next.objectStoreNames.contains("outbox")) {
        next.createObjectStore("outbox", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.onclose = () => openDbs.delete(userId);
  openDbs.set(userId, db);
  return db;
}

export async function getDeviceId(userId: string): Promise<string> {
  const db = await openDb(userId);
  const existing = await req<string | undefined>(db.transaction("kv").objectStore("kv").get("device_id"));
  if (existing) return existing;
  const id = crypto.randomUUID();
  const tx = db.transaction("kv", "readwrite");
  tx.objectStore("kv").put(id, "device_id");
  await req(tx.objectStore("kv").get("device_id"));
  return id;
}

function sortMessages(list: StoredMessage[]): StoredMessage[] {
  return [...list].sort((a, b) => {
    const byTime = a.created_at.localeCompare(b.created_at);
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });
}

function mergeStored(existing: StoredMessage | undefined, incoming: StoredMessage): StoredMessage {
  if (!existing) return incoming;
  return {
    ...existing,
    ...incoming,
    body: incoming.body || existing.body,
    image_url: incoming.image_url || existing.image_url,
    event_id: incoming.event_id || existing.event_id,
    event: incoming.event ?? existing.event,
    tick: applyTick(existing.tick ?? "sent", incoming.tick ?? existing.tick ?? "sent"),
  };
}

export async function ingestReceivedMessage(
  userId: string,
  message: ChatMessage,
  opts: { tick?: Tick; unread?: boolean } = {},
): Promise<void> {
  const db = await openDb(userId);
  const stored: StoredMessage = { ...message, tick: opts.tick ?? message.tick };
  const tx = db.transaction(["messages", "conversations"], "readwrite");
  const existing = (await req(tx.objectStore("messages").get(message.id))) as StoredMessage | undefined;
  const nextMessage = mergeStored(existing, stored);
  tx.objectStore("messages").put(nextMessage);
  const conv =
    ((await req(tx.objectStore("conversations").get(message.conversation_id))) as ConvState | undefined) ?? {
      id: message.conversation_id,
      unread_count: 0,
      updated_at: message.created_at,
    };
  const isNew = !existing;
  const unread = isNew && opts.unread !== false;
  const last = conv.last_message;
  const isLast = !last || nextMessage.created_at >= last.created_at;
  const next: ConvState = {
    id: message.conversation_id,
    last_message: isLast ? nextMessage : last,
    unread_count: unread ? conv.unread_count + 1 : conv.unread_count,
    updated_at: isLast ? nextMessage.created_at : conv.updated_at,
  };
  tx.objectStore("conversations").put(next);
  await req(tx.objectStore("messages").get(nextMessage.id));
  notify();
}

export async function ingestHistory(userId: string, messages: ChatMessage[]): Promise<void> {
  for (const message of messages) {
    await ingestReceivedMessage(userId, message, { unread: false });
  }
}

export async function listMessages(userId: string, conversationId: string): Promise<StoredMessage[]> {
  const db = await openDb(userId);
  const index = db.transaction("messages").objectStore("messages").index("by_conversation");
  const list = await req<StoredMessage[]>(index.getAll(conversationId));
  return sortMessages(list);
}

export async function overlayConversations(userId: string, conversations: Conversation[]): Promise<Conversation[]> {
  const db = await openDb(userId);
  const store = db.transaction("conversations").objectStore("conversations");
  const result: Conversation[] = [];
  for (const conv of conversations) {
    const local = (await req(store.get(conv.id))) as ConvState | undefined;
    result.push({
      ...conv,
      last_message: local?.last_message ?? conv.last_message,
      unread_count: local?.unread_count ?? conv.unread_count,
      updated_at: local?.updated_at ?? conv.updated_at,
    });
  }
  return result;
}

export async function enqueueOutbox(userId: string, item: OutboxItem): Promise<void> {
  const db = await openDb(userId);
  const pending: StoredMessage = {
    id: item.id,
    conversation_id: item.conversation_id,
    sender_id: item.sender_id ?? userId,
    kind: item.kind,
    body: item.body,
    image_url: item.image_url,
    event_id: item.event_id,
    reactions: [],
    created_at: item.created_at,
    tick: "pending",
  };
  const tx = db.transaction(["outbox", "messages", "conversations"], "readwrite");
  tx.objectStore("outbox").put(item);
  tx.objectStore("messages").put(pending);
  const conv =
    ((await req(tx.objectStore("conversations").get(item.conversation_id))) as ConvState | undefined) ?? {
      id: item.conversation_id,
      unread_count: 0,
      updated_at: item.created_at,
    };
  tx.objectStore("conversations").put({
    ...conv,
    last_message: pending,
    updated_at: item.created_at,
  });
  await req(tx.objectStore("outbox").get(item.id));
  notify();
}

export async function listOutbox(userId: string): Promise<OutboxItem[]> {
  const db = await openDb(userId);
  return req(db.transaction("outbox").objectStore("outbox").getAll());
}

export async function replaceOutboxMessage(
  userId: string,
  localId: string,
  server: ChatMessage,
  tick: Tick,
): Promise<void> {
  const db = await openDb(userId);
  const stored: StoredMessage = { ...server, tick };
  const tx = db.transaction(["messages", "outbox", "conversations"], "readwrite");
  tx.objectStore("messages").delete(localId);
  tx.objectStore("messages").put(stored);
  tx.objectStore("outbox").delete(localId);
  const conv =
    ((await req(tx.objectStore("conversations").get(server.conversation_id))) as ConvState | undefined) ?? {
      id: server.conversation_id,
      unread_count: 0,
      updated_at: server.created_at,
    };
  tx.objectStore("conversations").put({
    ...conv,
    last_message: stored,
    updated_at: server.created_at,
  });
  await req(tx.objectStore("messages").get(server.id));
  notify();
}

export async function setMessageTick(userId: string, messageId: string, incoming: Tick): Promise<void> {
  const db = await openDb(userId);
  const tx = db.transaction(["messages", "conversations"], "readwrite");
  const current = (await req(tx.objectStore("messages").get(messageId))) as StoredMessage | undefined;
  if (!current) return;
  const next: StoredMessage = { ...current, tick: applyTick(current.tick ?? "sent", incoming) };
  tx.objectStore("messages").put(next);
  const conv = (await req(tx.objectStore("conversations").get(current.conversation_id))) as ConvState | undefined;
  if (conv?.last_message?.id === messageId) {
    tx.objectStore("conversations").put({ ...conv, last_message: next });
  }
  await req(tx.objectStore("messages").get(messageId));
  notify();
}

export async function markConversationRead(userId: string, conversationId: string): Promise<void> {
  const db = await openDb(userId);
  const current = await req<ConvState | undefined>(
    db.transaction("conversations").objectStore("conversations").get(conversationId),
  );
  if (!current || current.unread_count === 0) return;
  const tx = db.transaction("conversations", "readwrite");
  tx.objectStore("conversations").put({ ...current, unread_count: 0 });
  await req(tx.objectStore("conversations").get(conversationId));
  notify();
}
