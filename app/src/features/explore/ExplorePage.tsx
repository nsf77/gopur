import { For, Show, createMemo, createSignal } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { t } from "../../lib/i18n";
import { feedEventsFromPages, useOrganizers, useSearchEvents } from "../../lib/queries";
import { InfiniteSentinel } from "../../ui/InfiniteSentinel";
import { StatusMessage } from "../../ui/StatusMessage";
import { Tabs } from "../../ui/Tabs";
import { EventCard } from "../feed/EventCard";
import IconSearch from "~icons/lucide/search";
import IconSlidersHorizontal from "~icons/lucide/sliders-horizontal";
import { Sheet } from "../../ui/Dialog";

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = createSignal("");
  const [filterOpen, setFilterOpen] = createSignal(false);
  const q = () => (typeof params.q === "string" ? params.q : "");
  const tab = () => (params.tab === "people" ? "people" : "events");
  const weekend = () => params.weekend === "1";
  const type = () => (typeof params.type === "string" ? params.type : "");

  const tooShort = () => q().trim().length > 0 && [...q().trim()].length < 2;
  const searchParams = createMemo(() => ({
    q: q().trim() || undefined,
    type: type() || undefined,
    weekend: weekend() ? "1" : undefined,
  }));
  const search = useSearchEvents(searchParams, () => tab() === "events" && !tooShort());
  const events = () => feedEventsFromPages(search.data?.pages);
  const organizers = useOrganizers(() => (tab() === "people" ? q().trim() : ""));

  const submitSearch = (value: string) => {
    setParams({ q: value || undefined, tab: tab() }, { replace: true });
  };

  return (
    <main class="pb-4">
      <form
        class="flex items-center gap-2 px-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch(draft() || q());
        }}
      >
        <label class="glass-surface flex min-h-11 flex-1 items-center gap-2 rounded-pill px-3">
          <IconSearch class="size-5 text-text-muted" />
          <input
            class="min-h-11 w-full bg-transparent outline-none"
            placeholder={t("explore.searchPlaceholder")}
            value={draft() || q()}
            onInput={(e) => setDraft(e.currentTarget.value)}
          />
        </label>
        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-full"
          aria-label={t("explore.filters")}
          onClick={() => setFilterOpen(true)}
        >
          <IconSlidersHorizontal class="size-5" />
        </button>
      </form>
      <Tabs
        aria-label={t("tabs.explore")}
        value={tab()}
        onChange={(value) => setParams({ tab: value === "people" ? "people" : undefined }, { replace: true })}
        items={[
          {
            value: "events",
            label: t("discover.events"),
            content: (
              <div>
                <Show when={tooShort()}>
                  <StatusMessage kind="empty" message={t("explore.tooShort")} />
                </Show>
                <Show when={!tooShort() && search.isPending && events().length === 0}>
                  <p class="p-4 text-sm text-text-muted">{t("common.loading")}</p>
                </Show>
                <Show when={!tooShort() && search.isError && events().length === 0}>
                  <StatusMessage kind="error" message={t("common.error")} onRetry={() => void search.refetch()} />
                </Show>
                <Show when={!tooShort() && search.isSuccess && events().length === 0}>
                  <StatusMessage kind="empty" message={t("discover.empty")} />
                </Show>
                <For each={events()} keyed={(row) => row.id}>
                  {(event) => <EventCard event={event()} />}
                </For>
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
            label: t("discover.people"),
            content: (
              <div class="px-4">
                <Show when={organizers.isPending}>
                  <p class="text-sm text-text-muted">{t("common.loading")}</p>
                </Show>
                <Show
                  when={
                    organizers.isSuccess &&
                    (organizers.data?.organizers.length ?? 0) === 0 &&
                    (organizers.data?.sources.length ?? 0) === 0
                  }
                >
                  <StatusMessage kind="empty" message={t("discover.peopleOrOrganisersEmpty")} />
                </Show>
                <For each={organizers.data?.organizers ?? []} keyed={(row) => row.key}>
                  {(org) => (
                    <a href={`/organizer/${org().key}`} class="flex min-h-11 items-center justify-between border-b border-divider py-3 text-inherit no-underline">
                      <span class="font-semibold">{org().name}</span>
                      <span class="text-xs text-text-muted">{t("discover.upcomingCount", { count: org().upcoming_count })}</span>
                    </a>
                  )}
                </For>
                <For each={organizers.data?.sources ?? []} keyed={(row) => row.id}>
                  {(src) => (
                    <a href={`/user/${src().id}`} class="flex min-h-11 items-center border-b border-divider py-3 text-inherit no-underline">
                      {src().display_name ?? src().username ?? src().id}
                    </a>
                  )}
                </For>
              </div>
            ),
          },
        ]}
      />
      <Sheet open={filterOpen()} title={t("explore.filters")} onOpenChange={setFilterOpen}>
        <label class="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={weekend()}
            onChange={(e) => setParams({ weekend: e.currentTarget.checked ? "1" : undefined }, { replace: true })}
          />
          {t("explore.weekend")}
        </label>
        <button
          type="button"
          class="mt-2 text-sm font-semibold text-accent"
          onClick={() => {
            setParams({ weekend: undefined, type: undefined }, { replace: true });
            setFilterOpen(false);
          }}
        >
          {t("explore.reset")}
        </button>
      </Sheet>
    </main>
  );
}
