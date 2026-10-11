import { feedEventsFromPages, useFeed } from "../lib/queries";
import { m } from "../paraglide/messages.js";
import { EventCard } from "../features/feed/EventCard";
import { InfiniteSentinel } from "../ui/InfiniteSentinel";
import { StatusMessage } from "../ui/StatusMessage";

export function HomePage() {
  const feed = useFeed();
  const events = feedEventsFromPages(feed.data?.pages);

  return (
    <main className="p-0">
      {feed.isPending && events.length === 0 ? (
        <p className="p-4 text-sm text-text-muted">{m.common_loading()}</p>
      ) : null}
      {feed.isError && events.length === 0 ? (
        <StatusMessage kind="error" message={m.home_error()} onRetry={() => void feed.refetch()} />
      ) : null}
      {feed.isSuccess && events.length === 0 ? <StatusMessage kind="empty" message={m.home_empty()} /> : null}
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
      {feed.isFetchingNextPage ? <p className="p-4 text-sm text-text-muted">{m.common_loadMore()}</p> : null}
      <InfiniteSentinel
        hasNextPage={Boolean(feed.hasNextPage)}
        isFetchingNextPage={feed.isFetchingNextPage}
        onLoadMore={() => void feed.fetchNextPage()}
      />
    </main>
  );
}
