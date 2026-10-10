import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import type { Notification } from "api";
import { For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationRead } from "../lib/api";
import { t } from "../lib/i18n";
import { isSignedIn } from "../lib/session";
import { StatusMessage } from "../ui/StatusMessage";

function hrefFor(item: Notification): string | null {
  const eventId = item.data.event_id;
  if (eventId) return `/event/${encodeURIComponent(eventId)}`;
  const actorId = item.data.actor_id;
  if (actorId) return `/user/${encodeURIComponent(actorId)}`;
  return null;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inbox = useQuery(() => ({
    queryKey: ["notifications"],
    enabled: isSignedIn(),
    queryFn: () => fetchNotifications(),
  }));
  const unread = useQuery(() => ({
    queryKey: ["notifications", "unread"],
    enabled: isSignedIn(),
    queryFn: fetchUnreadCount,
  }));
  const markAll = useMutation(() => ({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  }));

  const items = () => inbox.data?.notifications ?? [];
  const count = () => unread.data?.count ?? inbox.data?.unread_count ?? 0;

  const openItem = async (item: Notification) => {
    if (!item.read) {
      try {
        await markNotificationRead(item.id);
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        return;
      }
    }
    const href = hrefFor(item);
    if (href) navigate(href);
  };

  return (
    <main class="flex flex-col gap-3 px-4">
      <h1 class="m-0 text-2xl font-extrabold tracking-tight">{t("notifications.title")}</h1>
      <Show
        when={isSignedIn()}
        fallback={
          <p class="text-sm text-text-muted">
            <a href="/login?next=%2Fnotifications" class="font-semibold text-accent">
              {t("common.signIn")}
            </a>{" "}
            {t("notifications.signInHint")}
          </p>
        }
      >
        <div class="flex items-center justify-between gap-2">
          <p class="m-0 text-sm text-text-muted">{t("notifications.unread", { count: String(count()) })}</p>
          <button
            type="button"
            class="min-h-11 text-sm font-semibold text-accent disabled:opacity-40"
            disabled={count() === 0 || markAll.isPending}
            onClick={() => void markAll.mutate()}
          >
            {t("notifications.markAll")}
          </button>
        </div>
        <Show when={inbox.isPending}>
          <p class="text-sm text-text-muted">{t("common.loading")}</p>
        </Show>
        <Show when={inbox.isError}>
          <StatusMessage kind="error" message={t("common.error")} onRetry={() => void inbox.refetch()} />
        </Show>
        <Show when={inbox.isSuccess && items().length === 0}>
          <p class="py-8 text-center text-sm text-text-muted">{t("notifications.empty")}</p>
        </Show>
        <For each={items()} keyed={(item) => item.id}>
          {(item) => (
            <button
              type="button"
              class={`glass-surface flex w-full gap-3 rounded-2xl px-4 py-3 text-left ${item().read ? "" : "ring-1 ring-accent/40"}`}
              onClick={() => void openItem(item())}
            >
              <div class="min-w-0 flex-1">
                <p class="m-0 font-semibold">{item().title}</p>
                <p class="m-0 mt-1 text-sm text-text-muted">{item().body}</p>
                <p class="m-0 mt-2 text-xs text-text-subtle">{item().created_at}</p>
              </div>
              <Show when={!item().read}>
                <span class="mt-2 size-2 shrink-0 rounded-full bg-accent" />
              </Show>
            </button>
          )}
        </For>
      </Show>
    </main>
  );
}
