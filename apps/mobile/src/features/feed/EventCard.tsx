import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SealCheckIcon } from "phosphor-react-native";
import { G, O, eventImageUrls, eventText, formatEventWhen, formatHkdDollars, pipe } from "@gopur/shared";
import type { Event } from "@gopur/shared";
import { getLocale } from "../../paraglide/runtime.js";
import { m } from "../../paraglide/messages.js";
import { Avatar } from "../../ui/Avatar";
import { EventActionRow } from "../viewer/EventActionRow";
import { LikedByLine } from "../viewer/LikedByLine";

function priceLabel(event: Event): string {
  return pipe(
    O.fromNullable(event.price_cents),
    O.match(
      (cents) => {
        if (cents === 0) return m.event_free();
        const amount = formatHkdDollars(cents);
        if (G.isNumber(event.price_max_cents) && event.price_max_cents > cents) {
          return m.event_priceFrom({ amount });
        }
        return m.event_priceSingle({ amount });
      },
      () => m.event_priceUnannounced(),
    ),
  );
}

function placeLabel(location: string, district?: string | null): string {
  const place = location.trim();
  const area = district?.trim() ?? "";
  if (!area || (place && place.includes(area))) return place;
  if (!place) return area;
  return `${place}, ${area}`;
}

export function EventCard(props: { event: Event }) {
  const router = useRouter();
  const loc = getLocale();
  const title = eventText(props.event, "title", loc);
  const location = eventText(props.event, "location", loc);
  const district = eventText(props.event, "district", loc);
  const organizerName =
    props.event.organizer?.display_name || props.event.organizer?.username || m.profile_unknownUser();
  const hero = eventImageUrls(props.event)[0];
  const meta = [placeLabel(location, district), priceLabel(props.event), m.event_spots({ total: props.event.going_count })]
    .filter(Boolean)
    .join(" · ");

  return (
    <View className="border-b border-divider bg-bg">
      <Pressable className="px-4 py-3" onPress={() => router.push(`/event/${props.event.id}`)}>
        <View className="mb-2 flex-row items-center gap-2">
          <Avatar name={organizerName} size="sm" />
          <View className="min-w-0 flex-1 flex-row items-baseline gap-2">
            <Text className="flex-1 truncate font-bold text-text" numberOfLines={1}>
              {organizerName}
            </Text>
            {props.event.organizer?.is_verified ? <SealCheckIcon size={16} color="#304385" /> : null}
            <Text className="text-xs text-text-muted">
              {props.event.date_tbc ? m.event_dateTbc() : formatEventWhen(props.event.start_at, loc)}
            </Text>
          </View>
        </View>
        <Text className="mb-1 text-base font-bold text-text">{title}</Text>
        <Text className="text-sm text-text-muted">{meta}</Text>
      </Pressable>
      <View className="px-4 pb-3">
        <LikedByLine event={props.event} />
        <EventActionRow event={props.event} loginNext="/" />
      </View>
      {hero ? (
        <Pressable className="px-4 pb-3" onPress={() => router.push(`/event/${props.event.id}`)}>
          <Image source={{ uri: hero }} className="h-56 w-full rounded-md" />
        </Pressable>
      ) : null}
    </View>
  );
}
