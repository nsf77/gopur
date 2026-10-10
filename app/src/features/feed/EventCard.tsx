import { Show } from "solid-js";
import type { Event } from "api";
import { G, O, pipe } from "../../lib/belt";
import { eventImageUrls, eventText, formatEventWhen, formatHkdDollars } from "../../lib/event-text";
import { locale, t } from "../../lib/i18n";
import { Avatar } from "../../ui/Avatar";
import { EventActionRow } from "../viewer/EventActionRow";
import { LikedByLine } from "../viewer/LikedByLine";
import IconBadgeCheck from "~icons/lucide/badge-check";

function priceLabel(event: Event): string {
  return pipe(
    O.fromNullable(event.price_cents),
    O.match(
      (cents) => {
        if (cents === 0) return t("event.free");
        const amount = formatHkdDollars(cents);
        if (G.isNumber(event.price_max_cents) && event.price_max_cents > cents) {
          return t("event.priceFrom", { amount });
        }
        return t("event.priceSingle", { amount });
      },
      () => t("event.priceUnannounced"),
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
  const loc = () => locale();
  const title = () => eventText(props.event, "title", loc());
  const location = () => eventText(props.event, "location", loc());
  const district = () => eventText(props.event, "district", loc());
  const organizerName = () =>
    props.event.organizer?.display_name || props.event.organizer?.username || t("profile.unknownUser");
  const images = () => eventImageUrls(props.event);
  const meta = () =>
    [placeLabel(location(), district()), priceLabel(props.event), t("event.spots", { total: props.event.going_count })]
      .filter(Boolean)
      .join(" · ");

  return (
    <article class="event-card border-b border-divider bg-bg">
      <a href={`/event/${props.event.id}`} class="block px-4 py-3 text-inherit no-underline">
        <div class="mb-2 flex items-center gap-2">
          <Avatar name={organizerName()} size="sm" />
          <div class="flex min-w-0 flex-1 items-baseline gap-2 text-sm">
            <span class="truncate font-bold">{organizerName()}</span>
            <Show when={props.event.organizer?.is_verified}>
              <IconBadgeCheck class="size-4 text-accent" aria-hidden="true" />
            </Show>
            <Show when={!props.event.date_tbc && props.event.start_at}>
              <span class="whitespace-nowrap text-xs text-text-muted">{formatEventWhen(props.event.start_at, loc())}</span>
            </Show>
            <Show when={props.event.date_tbc}>
              <span class="whitespace-nowrap text-xs text-text-muted">{t("event.dateTbc")}</span>
            </Show>
          </div>
        </div>
        <h2 class="m-0 mb-1 text-base font-bold leading-snug">{title()}</h2>
        <p class="mt-1 text-sm text-text-muted">{meta()}</p>
      </a>
      <div class="px-4 pb-3">
        <LikedByLine event={props.event} />
        <EventActionRow event={props.event} loginNext="/" />
      </div>
      <Show when={images()[0]}>
        {(src) => (
          <a href={`/event/${props.event.id}`} class="block px-4 pb-3">
            <img src={src()} alt="" class="h-56 w-full rounded-md object-cover" loading="lazy" decoding="async" />
          </a>
        )}
      </Show>
    </article>
  );
}
