import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import type { Notification } from "api";
import { For, Show } from "solid-js";
import { O, pipe } from "@mobily/ts-belt";
import { fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationRead } from "../lib/api";
import { isSignedIn } from "../lib/session";

function hrefFor(item: Notification): string | null {
  const eventId = item.data.event_id;
  if (eventId) return `/event/${encodeURIComponent(eventId)}`;
  const actorId = item.data.actor_id;
  if (actorId) return `/my-events`;
  return null;
}

export function NotificationsPage() {
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
  const markOne = useMutation(() => ({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  }));
  const markAll = useMutation(() => ({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  }));

  const items = () => inbox.data?.notifications ?? [];
  const count = () =>
    pipe(O.fromNullable(unread.data), O.getWithDefault(inbox.data?.unread_count ?? 0));

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
    if (href) window.location.assign(href);
  };

  return (
    <section class="flex flex-col gap-3">
      <h1 class="m-0 text-2xl font-semibold tracking-tight">Notifications</h1>
      <Show
        when={isSignedIn()}
        fallback={
          <p class="text-sm text-slate-600">
            <a href="/signin" class="font-semibold text-accent">
              Sign in
            </a>{" "}
            to see your inbox.
          </p>
        }
      >
        <div class="flex items-center justify-between gap-2">
          <p class="m-0 text-sm text-slate-500">{count()} unread</p>
          <button
            type="button"
            class="min-h-11 text-sm font-semibold text-accent disabled:opacity-40"
            disabled={count() === 0 || markAll.isPending}
            onClick={() => void markAll.mutate()}
          >
            Mark all read
          </button>
        </div>
        <Show when={inbox.isPending}>
          <p class="text-sm text-slate-500">Loading…</p>
        </Show>
        <Show when={inbox.isError}>
          <p class="text-sm text-red-700">{String(inbox.error)}</p>
        </Show>
        <Show when={inbox.isSuccess && items().length === 0}>
          <p class="py-8 text-center text-sm text-slate-500">No notifications yet.</p>
        </Show>
        <For each={items()} keyed={(item) => item.id}>
          {(item) => (
            <button
              type="button"
              class={`glass-card flex w-full gap-3 rounded-2xl px-4 py-3 text-left ${item().read ? "" : "ring-1 ring-accent/40"}`}
              onClick={() => void openItem(item())}
            >
              <div class="min-w-0 flex-1">
                <p class="m-0 font-semibold">{item().title}</p>
                <p class="m-0 mt-1 text-sm text-slate-600">{item().body}</p>
                <p class="m-0 mt-2 text-xs text-slate-500">{item().created_at}</p>
              </div>
              <Show when={!item().read}>
                <span class="mt-2 size-2 shrink-0 rounded-full bg-accent" />
              </Show>
            </button>
          )}
        </For>
      </Show>
    </section>
  );
}
