import { For, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { isEventHost } from "../../lib/event-draft";
import { eventImageUrls, eventText, formatEventWhen, formatHkdDollars } from "../../lib/event-text";
import { locale, t } from "../../lib/i18n";
import { G, O, pipe } from "../../lib/belt";
import { isNotFound, useEvent } from "../../lib/queries";
import { currentUser } from "../../lib/session";
import { EventActionRow } from "../viewer/EventActionRow";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import IconExternalLink from "~icons/lucide/external-link";

export default function EventDetailPage() {
  const params = useParams();
  const id = () => params.id ?? "";
  const query = useEvent(id);
  const loc = () => locale();
  const event = () => query.data;

  return (
    <Show
      when={!isNotFound(query.error)}
      fallback={
        <main class="p-4">
          <p>{t("event.notFound")}</p>
        </main>
      }
    >
      <Show
        when={event()}
        fallback={
          <main class="p-4">
            <p class="text-sm text-text-muted">{t("common.loading")}</p>
          </main>
        }
      >
        {(item) => {
          const ev = item();
          const title = eventText(ev, "title", loc());
          const description = eventText(ev, "description", loc());
          const location = eventText(ev, "location", loc());
          const organizer = ev.organizer?.display_name ?? ev.organizer?.username ?? t("profile.unknownUser");
          const hero = eventImageUrls(ev)[0];
          const price = pipe(
            O.fromNullable(ev.price_cents),
            O.match(
              (cents) => (cents === 0 ? t("event.free") : t("event.priceSingle", { amount: formatHkdDollars(cents) })),
              () => t("event.priceUnannounced"),
            ),
          );
          return (
            <main class="px-4 pb-[env(safe-area-inset-bottom)]">
              <div class="-mx-4 mb-4 h-[220px] overflow-hidden bg-accent-subtle">
                <Show when={hero} fallback={<div class="flex h-full items-end p-4 text-lg font-bold">{title}</div>}>
                  {(src) => <img src={src()} alt={title} class="h-full w-full object-cover" />}
                </Show>
              </div>
              <h1 class="m-0 mb-2 text-[28px] font-extrabold leading-tight tracking-tight">{title}</h1>
              <EventActionRow event={ev} loginNext={`/event/${ev.id}`} />
              <Show
                when={pipe(
                  currentUser(),
                  O.map((u) => (isEventHost(u.id, ev) || u.role === "admin") && !ev.imported),
                  O.getWithDefault(false),
                )}
              >
                <div class="mt-3">
                  <Button href={`/event/${encodeURIComponent(ev.id)}/edit`} variant="secondary">
                    {t("editor.edit")}
                  </Button>
                </div>
              </Show>
              <p class="mt-2 text-sm text-text-muted">{price}</p>
              <p class="mt-1 text-sm text-text-muted">
                {ev.date_tbc ? t("event.dateTbc") : formatEventWhen(ev.start_at, loc())}
              </p>
              <Show when={location}>
                <p class="mt-1 text-sm">{location}</p>
              </Show>
              <div class="mt-4 flex items-center gap-2">
                <Avatar name={organizer} size="sm" src={undefined} />
                <div>
                  <p class="m-0 text-xs text-text-muted">{t("event.organizer")}</p>
                  <p class="m-0 font-semibold">{organizer}</p>
                </div>
              </div>
              <Show when={description}>
                <h2 class="mt-6 text-base font-bold">{t("event.description")}</h2>
                <p class="whitespace-pre-wrap text-sm leading-relaxed">{description}</p>
              </Show>
              <Show when={ev.sessions && ev.sessions.length > 0}>
                <h2 class="mt-6 text-base font-bold">{t("event.date")}</h2>
                <ul class="m-0 list-none p-0">
                  <For each={ev.sessions ?? []} keyed={(row) => `${row.start_at}-${row.end_at}`}>
                    {(session) => (
                      <li class="border-b border-divider py-2 text-sm">
                        {formatEventWhen(session().start_at, loc())}
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
              <Show when={G.isString(ev.source_url) && ev.source_url}>
                {(url) => (
                  <a class="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-accent no-underline" href={url()} target="_blank" rel="noreferrer">
                    {t("event.viewSource")}
                    <IconExternalLink class="size-4" />
                  </a>
                )}
              </Show>
            </main>
          );
        }}
      </Show>
    </Show>
  );
}
