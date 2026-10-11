import { useState } from "react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { MagnifyingGlassIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Button } from "@cloudflare/kumo/components/button";
import { Checkbox } from "@cloudflare/kumo/components/checkbox";
import { InputGroup } from "@cloudflare/kumo/components/input-group";
import { feedEventsFromPages, useOrganizers, useSearchEvents } from "../lib/queries";
import { m } from "../paraglide/messages.js";
import { EventCard } from "../features/feed/EventCard";
import { Sheet } from "../ui/Dialog";
import { InfiniteSentinel } from "../ui/InfiniteSentinel";
import { StatusMessage } from "../ui/StatusMessage";
import { Tabs } from "../ui/Tabs";

const tabParser = parseAsStringLiteral(["events", "people"] as const).withDefault("events");
const weekendParser = parseAsStringLiteral(["1"] as const);

export function ExplorePage() {
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [tab, setTab] = useQueryState("tab", tabParser);
  const [weekend, setWeekend] = useQueryState("weekend", weekendParser);
  const [type, setType] = useQueryState("type", parseAsString.withDefault(""));
  const [draft, setDraft] = useState(q);
  const [filterOpen, setFilterOpen] = useState(false);

  const trimmed = q.trim();
  const tooShort = trimmed.length > 0 && [...trimmed].length < 2;
  const searchParams = {
    q: trimmed || undefined,
    type: type || undefined,
    weekend: weekend === "1" ? "1" : undefined,
  };
  const search = useSearchEvents(searchParams, tab === "events" && !tooShort);
  const events = feedEventsFromPages(search.data?.pages);
  const organizers = useOrganizers(trimmed, tab === "people");

  return (
    <main className="pb-4">
      <form
        className="flex items-center gap-2 px-4 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          void setQ(draft || null);
        }}
      >
        <div className="glass-surface min-h-11 flex-1 overflow-hidden rounded-pill">
          <InputGroup.Root className="w-full border-0 bg-transparent shadow-none">
            <InputGroup.Addon>
              <MagnifyingGlassIcon className="size-5 text-text-muted" />
            </InputGroup.Addon>
            <InputGroup.Input
              aria-label={m.explore_searchPlaceholder()}
              placeholder={m.explore_searchPlaceholder()}
              value={draft}
              onValueChange={setDraft}
            />
          </InputGroup.Root>
        </div>
        <Button
          type="button"
          variant="ghost"
          shape="circle"
          aria-label={m.explore_filters()}
          onClick={() => setFilterOpen(true)}
          icon={<SlidersHorizontalIcon className="size-5" />}
        />
      </form>
      <Tabs
        aria-label={m.tabs_explore()}
        value={tab}
        onValueChange={(value) => void setTab(value === "people" ? "people" : "events")}
        items={[
          {
            value: "events",
            label: m.explore_tabEvents(),
            content: (
              <div>
                {tooShort ? <StatusMessage kind="empty" message={m.explore_tooShort()} /> : null}
                {!tooShort && search.isPending && events.length === 0 ? (
                  <p className="p-4 text-sm text-text-muted">{m.common_loading()}</p>
                ) : null}
                {!tooShort && search.isError && events.length === 0 ? (
                  <StatusMessage kind="error" message={m.common_error()} onRetry={() => void search.refetch()} />
                ) : null}
                {!tooShort && search.isSuccess && events.length === 0 ? (
                  <StatusMessage kind="empty" message={m.explore_empty()} />
                ) : null}
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
                <InfiniteSentinel
                  hasNextPage={Boolean(search.hasNextPage)}
                  isFetchingNextPage={search.isFetchingNextPage}
                  onLoadMore={() => void search.fetchNextPage()}
                />
              </div>
            ),
          },
          {
            value: "people",
            label: m.explore_tabPeople(),
            content: (
              <div className="px-4">
                {organizers.isPending ? <p className="text-sm text-text-muted">{m.common_loading()}</p> : null}
                {organizers.isError ? (
                  <StatusMessage kind="error" message={m.common_error()} onRetry={() => void organizers.refetch()} />
                ) : null}
                {organizers.isSuccess &&
                (organizers.data.organizers.length ?? 0) === 0 &&
                (organizers.data.sources.length ?? 0) === 0 ? (
                  <StatusMessage kind="empty" message={m.explore_peopleEmpty()} />
                ) : null}
                {organizers.data?.organizers.map((org) => (
                  <div
                    key={org.key}
                    className="flex min-h-11 items-center justify-between border-b border-divider py-3"
                  >
                    <span className="font-semibold">{org.name}</span>
                    <span className="text-xs text-text-muted">{m.explore_upcomingCount({ count: org.upcoming_count })}</span>
                  </div>
                ))}
                {organizers.data?.sources.map((src) => (
                  <div key={src.id} className="flex min-h-11 items-center border-b border-divider py-3">
                    {src.display_name ?? src.username ?? src.id}
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
      <Sheet open={filterOpen} title={m.explore_filters()} onOpenChange={setFilterOpen}>
        <Checkbox
          label={m.explore_weekend()}
          checked={weekend === "1"}
          onCheckedChange={(checked) => void setWeekend(checked === true ? "1" : null)}
        />
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-accent"
          onClick={() => {
            void setWeekend(null);
            void setType(null);
            setFilterOpen(false);
          }}
        >
          {m.explore_reset()}
        </button>
      </Sheet>
    </main>
  );
}
