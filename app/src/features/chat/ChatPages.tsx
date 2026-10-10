import { A, O, pipe } from "@mobily/ts-belt";
import { useNavigate, useParams } from "@solidjs/router";
import { useQuery } from "@tanstack/solid-query";
import { createEffect, createMemo, createSignal, For, onCleanup, onSettled, Show } from "solid-js";
import Check from "~icons/lucide/check";
import CheckCheck from "~icons/lucide/check-check";
import Clock from "~icons/lucide/clock";
import Send from "~icons/lucide/send";
import { t } from "../../lib/i18n";
import { sessionUser, viewerId } from "../../lib/session";
import { acceptConversation, createDm, fetchConversation, fetchConversations } from "./api";
import { conversationTitle, lastMessagePreview } from "./display";
import { setOpenThreadId } from "./envelopes";
import { createReadPointer, tabIsFocused } from "./read-pointer";
import { sendRead, startChatRelay } from "./relay";
import { outgoingBody, sendChat } from "./send-message";
import { listMessages, overlayConversations, subscribeChatStore } from "./store";
import type { ChatMessage, Conversation, ConversationFolder, Tick } from "./types";

function Ticks(props: { tick?: Tick }) {
  const tick = () => props.tick ?? "sent";
  return (
    <span class="inline-flex" data-testid="message-ticks" aria-hidden="true">
      <Show when={tick() === "pending"}>
        <Clock class="size-3.5 text-slate-400" />
      </Show>
      <Show when={tick() === "sent"}>
        <Check class="size-3.5 text-slate-400" />
      </Show>
      <Show when={tick() === "delivered"}>
        <CheckCheck class="size-3.5 text-slate-400" />
      </Show>
      <Show when={tick() === "read"}>
        <CheckCheck class="size-3.5 text-accent" />
      </Show>
    </span>
  );
}

export function ChatListPage() {
  const navigate = useNavigate();
  const [folder, setFolder] = createSignal<ConversationFolder>("inbox");
  const [rev, setRev] = createSignal(0);
  const [rows, setRows] = createSignal<Conversation[]>([]);
  const [peer, setPeer] = createSignal("");
  const list = useQuery(() => ({
    queryKey: ["chat", "list", folder(), sessionUser()?.id],
    queryFn: () => fetchConversations(folder()),
    enabled: Boolean(sessionUser()),
  }));

  onSettled(() => subscribeChatStore(() => setRev((n) => n + 1)));
  onSettled(() => {
    void startChatRelay();
  });
  createEffect(
    () => {
      rev();
      return { data: list.data, user: viewerId() };
    },
    (state) => {
      if (!state?.data || !state.user) {
        setRows(state?.data?.conversations ?? []);
        return;
      }
      void overlayConversations(state.user, state.data.conversations).then(setRows);
    },
  );

  const startDm = async () => {
    const id = peer().trim();
    if (!id) return;
    const conv = await createDm(id);
    navigate(`/chat/${conv.id}`);
  };

  return (
    <main class="bg-bg text-text">
      <Show when={!sessionUser()}>
        <p class="px-4 py-6 text-text-muted">
          {t("auth.signInRequired")}{" "}
          <a class="text-accent" href={`/login?next=${encodeURIComponent("/chat")}`}>
            {t("common.signIn")}
          </a>
        </p>
      </Show>
      <Show when={sessionUser()}>
        <div class="flex gap-2 px-4">
          <button
            type="button"
            class={`rounded px-3 py-1 text-sm ${folder() === "inbox" ? "bg-accent text-white" : "border border-accent text-accent"}`}
            onClick={() => setFolder("inbox")}
          >
            Inbox
          </button>
          <button
            type="button"
            class={`rounded px-3 py-1 text-sm ${folder() === "requests" ? "bg-accent text-white" : "border border-accent text-accent"}`}
            onClick={() => setFolder("requests")}
          >
            Requests
          </button>
        </div>
        <form
          class="mt-4 flex gap-2 px-4"
          onSubmit={(e) => {
            e.preventDefault();
            void startDm();
          }}
        >
          <input
            class="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="User id for a new DM"
            value={peer()}
            onInput={(e) => setPeer(e.currentTarget.value)}
          />
          <button type="submit" class="rounded bg-accent px-3 py-2 text-sm text-white">
            Open
          </button>
        </form>
        <Show when={list.isSuccess && rows().length === 0}>
          <p class="px-4 py-6 text-slate-500">No conversations. History lives on this device.</p>
        </Show>
        <ul class="mt-2">
          <For each={rows()}>
            {(row) => (
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left"
                  onClick={() => navigate(`/chat/${row.id}`)}
                >
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-semibold">{conversationTitle(row, viewerId())}</p>
                    <p class="truncate text-sm text-slate-500">{lastMessagePreview(row.last_message)}</p>
                  </div>
                  <Show when={row.unread_count > 0}>
                    <span class="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                      {row.unread_count > 9 ? "9+" : row.unread_count}
                    </span>
                  </Show>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </main>
  );
}

export function ThreadPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = () => params.id ?? "";
  const conv = useQuery(() => ({
    queryKey: ["chat", "conv", id(), sessionUser()?.id],
    queryFn: () => fetchConversation(id()),
    enabled: Boolean(id()) && Boolean(sessionUser()),
  }));
  const [rev, setRev] = createSignal(0);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [text, setText] = createSignal("");
  const [tabFocused, setTabFocused] = createSignal(tabIsFocused());

  onSettled(() => subscribeChatStore(() => setRev((n) => n + 1)));
  onSettled(() => {
    setOpenThreadId(id());
    return () => setOpenThreadId(null);
  });
  createEffect(
    () => ({ rev: rev(), user: viewerId(), convId: id() }),
    (state) => {
      if (!state?.user || !state.convId) {
        setMessages([]);
        return;
      }
      void listMessages(state.user, state.convId).then(setMessages);
    },
  );

  const onFocus = () => setTabFocused(tabIsFocused());
  window.addEventListener("focus", onFocus);
  window.addEventListener("blur", onFocus);
  document.addEventListener("visibilitychange", onFocus);
  onCleanup(() => {
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("blur", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
  });

  const readPointer = createReadPointer((messageId) => sendRead([messageId], id()));
  onCleanup(() => readPointer.dispose());
  createEffect(
    () => {
      const lastIncoming = pipe(
        messages(),
        A.reverse,
        A.find((msg) => msg.sender_id !== viewerId()),
        O.toNullable,
      );
      return { lastIncoming, focused: tabFocused() };
    },
    (state) => {
      if (!state?.lastIncoming || !state.focused) return;
      readPointer.seen(state.lastIncoming.id);
    },
  );

  const title = createMemo(() => {
    const c = conv.data;
    return c ? conversationTitle(c, viewerId()) : "Chat";
  });

  const submit = async () => {
    const parsed = outgoingBody(text());
    if ("error" in parsed) return;
    const ok = await sendChat(viewerId(), id(), parsed);
    if (ok) setText("");
  };

  return (
    <main class="flex min-h-[50dvh] flex-col bg-bg text-text">
      <header class="flex items-center gap-2 border-b border-divider px-4 py-3 md:hidden">
        <h1 class="flex-1 truncate font-bold">{title()}</h1>
        <button type="button" class="text-sm text-accent" onClick={() => navigate("/chat")}>
          {t("common.back")}
        </button>
      </header>
      <Show when={conv.data?.request_state === "pending"}>
        <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 text-sm">
          <p>Message request</p>
          <button
            type="button"
            class="rounded bg-accent px-3 py-1 text-white"
            onClick={() => void acceptConversation(id()).then(() => void conv.refetch())}
          >
            Accept
          </button>
        </div>
      </Show>
      <div class="flex-1 space-y-3 overflow-y-auto p-4">
        <Show when={messages().length === 0}>
          <p class="text-center text-xs text-slate-500">History lives on this device.</p>
        </Show>
        <For each={messages()}>
          {(message) => {
            const mine = message.sender_id === viewerId();
            return (
              <article class={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                <div class={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-accent text-white" : "bg-slate-100"}`}>
                  <Show when={message.kind === "photo"} fallback={<p class="whitespace-pre-wrap">{message.body}</p>}>
                    <img src={message.image_url} alt="" class="max-h-48 rounded-lg" />
                  </Show>
                </div>
                <Show when={mine}>
                  <Ticks tick={message.tick} />
                </Show>
              </article>
            );
          }}
        </For>
      </div>
      <form
        class="flex gap-2 border-t border-slate-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          class="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder={conv.data?.request_state === "pending" ? "Accept the request before sending" : "Message"}
          disabled={conv.data?.request_state === "pending"}
          value={text()}
          onInput={(e) => setText(e.currentTarget.value)}
        />
        <button
          type="submit"
          class="rounded bg-accent p-2 text-white disabled:opacity-50"
          disabled={conv.data?.request_state === "pending"}
          aria-label="Send"
        >
          <Send class="size-5" />
        </button>
      </form>
    </main>
  );
}
