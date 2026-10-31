import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { feedEventsFromPages, useOrganizers, useSearchEvents } from "../../src/lib/queries";
import { EventCard } from "../../src/features/feed/EventCard";
import { Screen } from "../../src/ui/Screen";
import { StatusMessage } from "../../src/ui/StatusMessage";
import { m } from "../../src/paraglide/messages.js";

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ q?: string; tab?: string; type?: string; weekend?: string }>();
  const router = useRouter();
  const q = typeof params.q === "string" ? params.q : "";
  const tab = params.tab === "people" ? "people" : "events";
  const type = typeof params.type === "string" ? params.type : "";
  const weekend = params.weekend === "1";
  const [draft, setDraft] = useState(q);
  const trimmed = q.trim();
  const tooShort = trimmed.length > 0 && [...trimmed].length < 2;
  const search = useSearchEvents(
    { q: trimmed || undefined, type: type || undefined, weekend: weekend ? "1" : undefined },
    tab === "events" && !tooShort,
  );
  const events = feedEventsFromPages(search.data?.pages);
  const organizers = useOrganizers(trimmed, tab === "people");

  const setParams = (next: Record<string, string | undefined>) => {
    const merged: Record<string, string> = {};
    const current = { q, tab, type, weekend: weekend ? "1" : undefined, ...next };
    for (const [key, value] of Object.entries(current)) {
      if (value) merged[key] = value;
    }
    router.setParams(merged);
  };

  return (
    <Screen>
      <View className="flex-row items-center gap-2 px-4 pb-2">
        <TextInput
          className="min-h-11 flex-1 rounded-full border border-divider bg-surface px-4 text-text"
          placeholder={m.explore_searchPlaceholder()}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => setParams({ q: draft || undefined })}
        />
      </View>
      <View className="flex-row gap-2 px-4 pb-2">
        <Pressable onPress={() => setParams({ tab: "events" })}>
          <Text className={tab === "events" ? "font-bold text-accent" : "text-text-muted"}>{m.explore_tabEvents()}</Text>
        </Pressable>
        <Pressable onPress={() => setParams({ tab: "people" })}>
          <Text className={tab === "people" ? "font-bold text-accent" : "text-text-muted"}>{m.explore_tabPeople()}</Text>
        </Pressable>
        <Pressable onPress={() => setParams({ weekend: weekend ? undefined : "1" })}>
          <Text className={weekend ? "font-bold text-accent" : "text-text-muted"}>{m.explore_weekend()}</Text>
        </Pressable>
      </View>
      {tab === "events" ? (
        <>
          {tooShort ? <StatusMessage kind="empty" message={m.explore_tooShort()} /> : null}
          {!tooShort && search.isError ? (
            <StatusMessage kind="error" message={m.common_error()} onRetry={() => void search.refetch()} />
          ) : null}
          {!tooShort && search.isSuccess && events.length === 0 ? <StatusMessage kind="empty" message={m.explore_empty()} /> : null}
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </>
      ) : (
        <>
          {organizers.isError ? <StatusMessage kind="error" message={m.common_error()} /> : null}
          {organizers.isSuccess && (organizers.data.organizers.length === 0 && organizers.data.sources.length === 0) ? (
            <StatusMessage kind="empty" message={m.explore_peopleEmpty()} />
          ) : null}
          {(organizers.data?.organizers ?? []).map((org) => (
            <View key={org.key} className="border-b border-divider px-4 py-3">
              <Text className="font-semibold text-text">{org.name}</Text>
              <Text className="text-sm text-text-muted">{m.explore_upcomingCount({ count: org.upcoming_count })}</Text>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
