import { Image, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { canEditEvent, eventImageUrls, eventText, formatEventWhen, formatHkdDollars, O, pipe } from "@gopur/shared";
import { isNotFound, useEvent } from "../../../src/lib/queries";
import { getLocale } from "../../../src/paraglide/runtime.js";
import { m } from "../../../src/paraglide/messages.js";
import { useSessionStore } from "../../../src/stores/session";
import { EventActionRow } from "../../../src/features/viewer/EventActionRow";
import { Avatar } from "../../../src/ui/Avatar";
import { Screen } from "../../../src/ui/Screen";
import { StatusMessage } from "../../../src/ui/StatusMessage";

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useEvent(id ?? "");
  const loc = getLocale();
  const user = useSessionStore((s) => s.user);
  const ev = query.data;

  if (isNotFound(query.error)) {
    return (
      <Screen>
        <Text className="p-4 text-text">{m.event_notFound()}</Text>
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <Screen>
        <StatusMessage kind="error" message={m.common_error()} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  if (!ev) {
    return (
      <Screen>
        <Text className="p-4 text-sm text-text-muted">{m.common_loading()}</Text>
      </Screen>
    );
  }

  const title = eventText(ev, "title", loc);
  const description = eventText(ev, "description", loc);
  const location = eventText(ev, "location", loc);
  const organizer = ev.organizer?.display_name ?? ev.organizer?.username ?? m.profile_unknownUser();
  const hero = eventImageUrls(ev)[0];
  const price = pipe(
    O.fromNullable(ev.price_cents),
    O.match(
      (cents) => (cents === 0 ? m.event_free() : m.event_priceSingle({ amount: formatHkdDollars(cents) })),
      () => m.event_priceUnannounced(),
    ),
  );

  return (
    <Screen padded={false}>
      <View className="mb-4 h-[220px] bg-accent/10">
        {hero ? <Image source={{ uri: hero }} className="h-full w-full" /> : (
          <View className="h-full justify-end p-4">
            <Text className="text-lg font-bold text-text">{title}</Text>
          </View>
        )}
      </View>
      <View className="px-4">
        <Text className="mb-2 text-[28px] font-extrabold text-text">{title}</Text>
        {canEditEvent(user, ev) ? (
          <Pressable onPress={() => router.push(`/event/${ev.id}/edit`)}>
            <Text className="mb-2 text-sm font-semibold text-accent">{m.eventEditor_editTitle()}</Text>
          </Pressable>
        ) : null}
        <EventActionRow event={ev} loginNext={`/event/${ev.id}`} />
        <Text className="mt-2 text-sm text-text-muted">{price}</Text>
        <Text className="mt-1 text-sm text-text-muted">{ev.date_tbc ? m.event_dateTbc() : formatEventWhen(ev.start_at, loc)}</Text>
        {location ? <Text className="mt-1 text-sm text-text">{location}</Text> : null}
        <View className="mt-4 flex-row items-center gap-2">
          <Avatar name={organizer} size="sm" />
          <Text className="font-semibold text-text">{organizer}</Text>
        </View>
        {description ? (
          <View className="mt-4">
            <Text className="mb-1 font-bold text-text">{m.event_description()}</Text>
            <Text className="text-sm leading-5 text-text">{description}</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
