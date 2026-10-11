import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { A, O, pipe } from "../../lib/belt";
import { m } from "../../paraglide/messages.js";
import { useChatChrome } from "../../stores/chat-chrome";
import { useSessionStore, viewerId } from "../../stores/session";
import { Button } from "../../ui/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { button, chatBubble } from "../../ui/styles";
import { acceptConversation, fetchConversation, fetchMessages } from "./api";
import { conversationTitle } from "./display";
import { setOpenThreadId } from "./envelopes";
import { MessageTicks } from "./MessageTicks";
import { createReadPointer, tabIsFocused } from "./read-pointer";
import { sendRead, startChatRelay, stopChatRelay } from "./relay";
import { outgoingBody, sendChat } from "./send-message";
import { ingestHistory, listMessages } from "./store";
import type { ChatMessage } from "./types";
import { useChatStoreGeneration } from "./use-chat-store";

export function ThreadPage({ id }: { id: string }) {
  const user = useSessionStore((s) => s.user);
  const setThreadTitle = useChatChrome((s) => s.setThreadTitle);
  const conv = useQuery({
    queryKey: ["chat", "conv", id, user?.id],
    queryFn: () => fetchConversation(id),
    enabled: Boolean(id) && Boolean(user),
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(tabIsFocused);
  const [sending, setSending] = useState(false);
  const rev = useChatStoreGeneration();
  const scroller = useRef<HTMLDivElement>(null);
  const pointer = useRef(createReadPointer((messageId) => sendRead([messageId], id)));

  useEffect(() => {
    pointer.current = createReadPointer((messageId) => sendRead([messageId], id));
    return () => pointer.current.dispose();
  }, [id]);

  useEffect(() => {
    if (!user) {
      stopChatRelay();
      return;
    }
    void startChatRelay();
  }, [user]);

  useEffect(() => {
    setOpenThreadId(id);
    return () => setOpenThreadId(null);
  }, [id]);

  useEffect(() => {
    if (!user || !conv.data) {
      setThreadTitle(null);
      return;
    }
    setThreadTitle(conversationTitle(conv.data, user.id));
    return () => setThreadTitle(null);
  }, [conv.data, user, setThreadTitle]);

  useEffect(() => {
    if (!user || !id) return;
    void fetchMessages(id)
      .then((page) => ingestHistory(user.id, page.messages))
      .catch(() => {
        /* local history still shows */
      });
  }, [id, user]);

  useEffect(() => {
    const uid = viewerId();
    if (!uid || !id) {
      setMessages([]);
      return;
    }
    void listMessages(uid, id).then(setMessages);
  }, [id, rev, user]);

  useEffect(() => {
    const onFocus = () => setFocused(tabIsFocused());
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  useEffect(() => {
    const lastIncoming = pipe(
      messages,
      A.reverse,
      A.find((msg) => msg.sender_id !== viewerId()),
      O.toNullable,
    );
    if (!lastIncoming || !focused) return;
    pointer.current.seen(lastIncoming.id);
  }, [messages, focused]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  if (!user) {
    return (
      <main className="grid gap-4 p-4">
        <p className="m-0 text-sm text-text-muted">{m.chat_signInRequired()}</p>
        <Link to="/login" search={{ next: `/chat/${id}` }} className={button()}>
          {m.common_signIn()}
        </Link>
      </main>
    );
  }

  const pending = conv.data?.request_state === "pending";
  const mineId = user.id;

  const submit = () => {
    const parsed = outgoingBody(text);
    if ("error" in parsed || sending || pending) return;
    setSending(true);
    void sendChat(mineId, id, parsed)
      .then((ok) => {
        if (ok) setText("");
      })
      .finally(() => setSending(false));
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-bg text-text">
      {conv.isError ? (
        <StatusMessage kind="error" message={m.chat_threadError()} onRetry={() => void conv.refetch()} />
      ) : null}
      {pending ? (
        <div className="flex items-center justify-between gap-2 border-b border-divider px-4 py-2 text-sm">
          <p className="m-0">{m.chat_requestPending()}</p>
          <Button
            type="button"
            onClick={() => {
              void acceptConversation(id).then(() => void conv.refetch());
            }}
          >
            {m.chat_accept()}
          </Button>
        </div>
      ) : null}
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-text-muted">{m.chat_historyHint()}</p>
        ) : null}
        {messages.map((message) => {
          const mine = message.sender_id === mineId;
          return (
            <article key={message.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
              <div className={chatBubble({ mine })}>
                {message.unsent_at ? (
                  <p className="m-0 italic opacity-80">{m.chat_unsent()}</p>
                ) : message.kind === "photo" && message.image_url ? (
                  <img src={message.image_url} alt="" className="max-h-48 rounded-lg" />
                ) : message.kind === "event" ? (
                  <p className="m-0 font-semibold">{message.event?.title ?? m.chat_event()}</p>
                ) : (
                  <p className="m-0">{message.body}</p>
                )}
              </div>
              {mine ? <MessageTicks tick={message.tick} /> : null}
            </article>
          );
        })}
      </div>
      <form
        className="flex gap-2 border-t border-divider p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          className="min-h-11 flex-1 rounded-md border border-divider bg-surface px-3 text-sm"
          placeholder={pending ? m.chat_requestPending() : m.chat_messagePlaceholder()}
          disabled={pending || sending}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
        />
        <Button type="submit" disabled={pending || sending} aria-label={m.chat_send()}>
          <Send className="size-5" />
        </Button>
      </form>
    </main>
  );
}
