import { Link } from "@tanstack/react-router";
import { SealCheckIcon } from "@phosphor-icons/react";
import { G, O, pipe } from "../../lib/belt";
import { eventImageUrls, eventText, formatEventWhen, formatHkdDollars } from "../../lib/event-text";
import type { Event } from "../../lib/schemas";
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
  const loc = getLocale();
  const title = eventText(props.event, "title", loc);
  const location = eventText(props.event, "location", loc);
  const district = eventText(props.event, "district", loc);
  const organizerName =
    props.event.organizer?.display_name || props.event.organizer?.username || m.profile_unknownUser();
  const images = eventImageUrls(props.event);
  const hero = images[0];
  const meta = [placeLabel(location, district), priceLabel(props.event), m.event_spots({ total: props.event.going_count })]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="event-card border-b border-divider bg-bg">
      <Link to="/event/$id" params={{ id: props.event.id }} className="block px-4 py-3 text-inherit no-underline">
        <div className="mb-2 flex items-center gap-2">
          <Avatar name={organizerName} size="sm" />
          <div className="flex min-w-0 flex-1 items-baseline gap-2 text-sm">
            <span className="truncate font-bold">{organizerName}</span>
            {props.event.organizer?.is_verified ? <SealCheckIcon className="size-4 text-accent" aria-hidden="true" /> : null}
            {!props.event.date_tbc && props.event.start_at ? (
              <span className="whitespace-nowrap text-xs text-text-muted">{formatEventWhen(props.event.start_at, loc)}</span>
            ) : null}
            {props.event.date_tbc ? (
              <span className="whitespace-nowrap text-xs text-text-muted">{m.event_dateTbc()}</span>
            ) : null}
          </div>
        </div>
        <h2 className="m-0 mb-1 text-base font-bold leading-snug">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{meta}</p>
      </Link>
      <div className="px-4 pb-3">
        <LikedByLine event={props.event} />
        <EventActionRow event={props.event} loginNext="/" />
      </div>
      {hero ? (
        <Link to="/event/$id" params={{ id: props.event.id }} className="block px-4 pb-3">
          <img src={hero} alt="" className="h-56 w-full rounded-md object-cover" loading="lazy" decoding="async" />
        </Link>
      ) : null}
    </article>
  );
}
