import { For, Show } from "solid-js";
import { feedEventsFromPages, useFeed } from "../../lib/queries";
import { t } from "../../lib/i18n";
import { InfiniteSentinel } from "../../ui/InfiniteSentinel";
import { StatusMessage } from "../../ui/StatusMessage";
import { EventCard } from "./EventCard";

export default function FeedPage() {
  const feed = useFeed();
  const events = () => feedEventsFromPages(feed.data?.pages);

  return (
    <main class="p-0">
      <Show when={feed.isPending && events().length === 0}>
        <p class="p-4 text-sm text-text-muted">{t("common.loading")}</p>
      </Show>
      <Show when={feed.isError && events().length === 0}>
        <StatusMessage kind="error" message={t("home.error")} onRetry={() => void feed.refetch()} />
      </Show>
      <Show when={feed.isSuccess && events().length === 0}>
        <StatusMessage kind="empty" message={t("home.empty")} />
      </Show>
      <For each={events()} keyed={(row) => row.id}>
        {(event) => <EventCard event={event()} />}
      </For>
      <Show when={feed.isFetchingNextPage}>
        <p class="p-4 text-sm text-text-muted">{t("common.loadMore")}</p>
      </Show>
      <InfiniteSentinel
        hasNextPage={Boolean(feed.hasNextPage)}
        isFetchingNextPage={feed.isFetchingNextPage}
        onLoadMore={() => void feed.fetchNextPage()}
      />
    </main>
  );
}
