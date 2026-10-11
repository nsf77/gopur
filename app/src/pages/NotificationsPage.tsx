import { useNavigate } from "@tanstack/react-router";
import { O, pipe } from "../lib/belt";
import {
  notificationsFromPages,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "../lib/queries";
import type { Notification } from "../lib/schemas";
import { m } from "../paraglide/messages.js";
import { isSignedIn } from "../stores/session";
import { AuthPrompt } from "../features/auth/AuthPrompt";
import { NotificationRow } from "../features/notifications/NotificationRow";
import { notificationHref } from "../features/notifications/links";
import { InfiniteSentinel } from "../ui/InfiniteSentinel";
import { StatusMessage } from "../ui/StatusMessage";

export function NotificationsPage() {
  const navigate = useNavigate();
  const signedIn = isSignedIn();
  const inbox = useNotifications(signedIn);
  const unread = useUnreadCount(signedIn);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const items = notificationsFromPages(inbox.data?.pages);
  const count = unread.data?.count ?? inbox.data?.pages[0]?.unread_count ?? 0;

  const openItem = (item: Notification) => {
    const go = () => {
      const href = pipe(notificationHref(item), O.toNullable);
      if (href?.startsWith("/event/")) {
        void navigate({ to: "/event/$id", params: { id: decodeURIComponent(href.slice("/event/".length)) } });
      } else if (href?.startsWith("/chat/")) {
        void navigate({ to: "/chat/$id", params: { id: href.slice("/chat/".length) } });
      } else if (href === "/profile") {
        void navigate({ to: "/profile" });
      }
    };
    if (!item.read) {
      markRead.mutate(item.id, { onSuccess: go });
      return;
    }
    go();
  };

  return (
    <main className="mx-auto flex max-w-md flex-col gap-3 p-4 pb-8">
      {!signedIn ? <AuthPrompt next="/notifications" message={m.notifications_signIn()} /> : null}
      {signedIn ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-sm text-text-muted">{m.notifications_unread({ count })}</p>
            <button
              type="button"
              className="min-h-11 text-sm font-semibold text-accent disabled:opacity-40"
              disabled={count === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              {m.notifications_markAll()}
            </button>
          </div>
          {inbox.isPending ? <p className="text-sm text-text-muted">{m.common_loading()}</p> : null}
          {inbox.isError ? (
            <StatusMessage kind="error" message={m.common_error()} onRetry={() => void inbox.refetch()} />
          ) : null}
          {inbox.isSuccess && items.length === 0 ? (
            <p className="py-8 text-center text-text-muted">{m.notifications_empty()}</p>
          ) : null}
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onSelect={() => openItem(item)} />
          ))}
          <InfiniteSentinel
            hasNextPage={Boolean(inbox.hasNextPage)}
            isFetchingNextPage={inbox.isFetchingNextPage}
            onLoadMore={() => void inbox.fetchNextPage()}
          />
        </>
      ) : null}
    </main>
  );
}
