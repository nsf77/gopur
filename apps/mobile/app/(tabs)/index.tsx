import { Text } from "react-native";
import { feedEventsFromPages, useFeed } from "../../src/lib/queries";
import { EventCard } from "../../src/features/feed/EventCard";
import { LoadingBlock, Screen } from "../../src/ui/Screen";
import { StatusMessage } from "../../src/ui/StatusMessage";
import { m } from "../../src/paraglide/messages.js";

export default function HomeScreen() {
  const feed = useFeed();
  const events = feedEventsFromPages(feed.data?.pages);

  return (
    <Screen refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} padded={false}>
      {feed.isPending && events.length === 0 ? <LoadingBlock label={m.common_loading()} /> : null}
      {feed.isError && events.length === 0 ? (
        <StatusMessage kind="error" message={m.home_error()} onRetry={() => void feed.refetch()} />
      ) : null}
      {feed.isSuccess && events.length === 0 ? <StatusMessage kind="empty" message={m.home_empty()} /> : null}
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
      {feed.hasNextPage ? (
        <Text
          className="p-4 text-center text-sm text-accent"
          onPress={() => void feed.fetchNextPage()}
        >
          {feed.isFetchingNextPage ? m.common_loadMore() : m.common_loadMore()}
        </Text>
      ) : null}
    </Screen>
  );
}
