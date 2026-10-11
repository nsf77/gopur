import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { m } from "../../paraglide/messages.js";
import { useSessionStore, viewerId } from "../../stores/session";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { Tabs } from "../../ui/Tabs";
import { createDm, fetchConversations } from "./api";
import { conversationPeer, conversationTitle, lastMessagePreview } from "./display";
import { startChatRelay, stopChatRelay } from "./relay";
import { ingestHistory, overlayConversations } from "./store";
import type { Conversation, ConversationFolder } from "./types";
import { useChatStoreGeneration } from "./use-chat-store";

export function ChatListPage() {
  const user = useSessionStore((s) => s.user);
  const navigate = useNavigate();
  const [folder, setFolder] = useState<ConversationFolder>("inbox");
  const [rows, setRows] = useState<Conversation[]>([]);
  const [peer, setPeer] = useState("");
  const [opening, setOpening] = useState(false);
  const rev = useChatStoreGeneration();
  const list = useQuery({
    queryKey: ["chat", "list", folder, user?.id],
    queryFn: () => fetchConversations(folder),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) {
      stopChatRelay();
      return;
    }
    void startChatRelay();
  }, [user]);

  useEffect(() => {
    const data = list.data;
    const uid = viewerId();
    if (!data || !uid) {
      setRows(data?.conversations ?? []);
      return;
    }
    const heads = data.conversations
      .map((conv) => conv.last_message)
      .filter((message): message is NonNullable<typeof message> => Boolean(message));
    void ingestHistory(uid, heads).then(() => overlayConversations(uid, data.conversations)).then(setRows);
  }, [list.data, rev, user]);

  if (!user) {
    return (
      <main className="grid gap-4 p-4">
        <p className="m-0 text-sm text-text-muted">{m.chat_signInRequired()}</p>
        <Button to="/login" search={{ next: "/chat" }}>
          {m.common_signIn()}
        </Button>
      </main>
    );
  }

  return (
    <main className="bg-bg text-text">
      <form
        className="mt-2 flex gap-2 px-4"
        onSubmit={(event) => {
          event.preventDefault();
          const id = peer.trim();
          if (!id || opening) return;
          setOpening(true);
          void createDm(id)
            .then((conv) => navigate({ to: "/chat/$id", params: { id: conv.id } }))
            .finally(() => setOpening(false));
        }}
      >
        <input
          className="min-h-11 flex-1 rounded-md border border-divider bg-surface px-3 text-sm"
          placeholder={m.chat_newDmPlaceholder()}
          value={peer}
          onChange={(event) => setPeer(event.currentTarget.value)}
        />
        <Button type="submit" disabled={opening}>
          {m.chat_open()}
        </Button>
      </form>
      <Tabs
        aria-label={m.chat_folders()}
        value={folder}
        onValueChange={(value) => setFolder(value === "requests" ? "requests" : "inbox")}
        items={[
          { value: "inbox", label: m.chat_inbox(), content: null },
          { value: "requests", label: m.chat_requests(), content: null },
        ]}
      />
      <ConversationList
        loading={list.isPending}
        error={list.isError}
        empty={list.isSuccess && rows.length === 0}
        rows={rows}
        onRetry={() => void list.refetch()}
        viewer={user.id}
      />
    </main>
  );
}

function ConversationList(props: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  rows: Conversation[];
  onRetry: () => void;
  viewer: string;
}) {
  if (props.loading && props.rows.length === 0) {
    return <p className="p-4 text-sm text-text-muted">{m.common_loading()}</p>;
  }
  if (props.error && props.rows.length === 0) {
    return <StatusMessage kind="error" message={m.chat_listError()} onRetry={props.onRetry} />;
  }
  if (props.empty) {
    return <StatusMessage kind="empty" message={m.chat_empty()} />;
  }
  return (
    <ul className="m-0 list-none p-0">
      {props.rows.map((row) => {
        const peer = conversationPeer(row, props.viewer);
        const title = conversationTitle(row, props.viewer);
        return (
          <li key={row.id}>
            <Link
              to="/chat/$id"
              params={{ id: row.id }}
              className="flex w-full items-center gap-3 border-b border-divider px-4 py-3 text-left"
            >
              <Avatar name={title} src={row.photo_url ?? peer?.avatar_url} size="md" />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate font-semibold">{title}</p>
                <p className="m-0 truncate text-sm text-text-muted">{lastMessagePreview(row.last_message)}</p>
              </div>
              {row.unread_count > 0 ? (
                <span className="rounded-pill bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-contrast">
                  {row.unread_count > 9 ? "9+" : row.unread_count}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
