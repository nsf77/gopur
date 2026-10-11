import { Link } from "@cloudflare/kumo/components/link";
import { G, O, pipe } from "../lib/belt";
import { eventImageUrls, eventText, formatEventWhen, formatHkdDollars } from "../lib/event-text";
import { isNotFound, useEvent } from "../lib/queries";
import { getLocale } from "../paraglide/runtime.js";
import { m } from "../paraglide/messages.js";
import { EventActionRow } from "../features/viewer/EventActionRow";
import { Avatar } from "../ui/Avatar";
import { StatusMessage } from "../ui/StatusMessage";

export function EventPage({ id }: { id: string }) {
  const query = useEvent(id);
  const loc = getLocale();
  const ev = query.data;

  if (isNotFound(query.error)) {
    return (
      <main className="p-4">
        <p>{m.event_notFound()}</p>
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="p-4">
        <StatusMessage kind="error" message={m.common_error()} onRetry={() => void query.refetch()} />
      </main>
    );
  }

  if (!ev) {
    return (
      <main className="p-4">
        <p className="text-sm text-text-muted">{m.common_loading()}</p>
      </main>
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
    <main className="px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="-mx-4 mb-4 h-[220px] overflow-hidden bg-accent-subtle">
        {hero ? (
          <img src={hero} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-end p-4 text-lg font-bold">{title}</div>
        )}
      </div>
      <h1 className="m-0 mb-2 text-[28px] font-extrabold leading-tight tracking-tight">{title}</h1>
      <EventActionRow event={ev} loginNext={`/event/${ev.id}`} />
      <p className="mt-2 text-sm text-text-muted">{price}</p>
      <p className="mt-1 text-sm text-text-muted">{ev.date_tbc ? m.event_dateTbc() : formatEventWhen(ev.start_at, loc)}</p>
      {location ? <p className="mt-1 text-sm">{location}</p> : null}
      <div className="mt-4 flex items-center gap-2">
        <Avatar name={organizer} size="sm" />
        <div>
          <p className="m-0 text-xs text-text-muted">{m.event_organizer()}</p>
          <p className="m-0 font-semibold">{organizer}</p>
        </div>
      </div>
      {description ? (
        <>
          <h2 className="mt-6 text-base font-bold">{m.event_description()}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{description}</p>
        </>
      ) : null}
      {ev.sessions && ev.sessions.length > 0 ? (
        <>
          <h2 className="mt-6 text-base font-bold">{m.event_date()}</h2>
          <ul className="m-0 list-none p-0">
            {ev.sessions.map((session) => (
              <li key={`${session.start_at}-${session.end_at}`} className="border-b border-divider py-2 text-sm">
                {formatEventWhen(session.start_at, loc)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {G.isString(ev.source_url) && ev.source_url ? (
        <Link
          className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold"
          href={ev.source_url}
          target="_blank"
          rel="noreferrer"
        >
          {m.event_viewSource()}
          <Link.ExternalIcon />
        </Link>
      ) : null}
    </main>
  );
}
