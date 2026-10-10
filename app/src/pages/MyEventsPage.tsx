import { useQuery } from "@tanstack/solid-query";
import type { Event, MyEvent } from "api";
import { For, Show, createMemo, createSignal } from "solid-js";
import Plus from "~icons/lucide/plus";
import { fetchHostedEvents, fetchLikedEvents, fetchMySignups, fetchSavedEvents } from "../lib/api";
import { O } from "../lib/belt";
import { t } from "../lib/i18n";
import { canCreateEvents, currentUser, isSignedIn } from "../lib/session";
import { EventCard } from "../features/feed/EventCard";
import { Button } from "../ui/Button";
import { StatusMessage } from "../ui/StatusMessage";

type TabKey = "upcoming" | "past" | "saved" | "likes" | "hosted";

const TAB_ITEMS: Array<{ value: TabKey; labelKey: "upcoming" | "past" | "saved" | "likes" | "hosted" }> = [
  { value: "upcoming", labelKey: "upcoming" },
  { value: "past", labelKey: "past" },
  { value: "saved", labelKey: "saved" },
  { value: "likes", labelKey: "likes" },
  { value: "hosted", labelKey: "hosted" },
];

function TabStrip(props: { value: TabKey; onChange: (value: TabKey) => void }) {
  return (
    <div class="mb-4 px-4" role="tablist" aria-label={t("tabs.myEvents")}>
      <div class="flex gap-1 overflow-x-auto">
        <For each={TAB_ITEMS} keyed={(item) => item.value}>
          {(item) => {
            const selected = () => props.value === item().value;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={selected() ? "true" : "false"}
                class={`min-h-11 shrink-0 rounded-pill px-3 text-sm font-semibold ${
                  selected() ? "bg-accent-subtle text-accent" : "text-text-muted"
                }`}
                onClick={() => props.onChange(item().value)}
              >
                {t(`myEvents.${item().labelKey}`)}
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
}

export default function MyEventsPage() {
  const [tab, setTab] = createSignal<TabKey>("upcoming");
  const signedIn = () => isSignedIn();
  const user = () => O.toNullable(currentUser());

  const upcoming = useQuery(() => ({
    queryKey: ["me", "events", "upcoming"],
    enabled: signedIn() && tab() === "upcoming",
    queryFn: () => fetchMySignups("upcoming"),
  }));
  const past = useQuery(() => ({
    queryKey: ["me", "events", "past"],
    enabled: signedIn() && tab() === "past",
    queryFn: () => fetchMySignups("past"),
  }));
  const saved = useQuery(() => ({
    queryKey: ["me", "saved"],
    enabled: signedIn() && tab() === "saved",
    queryFn: fetchSavedEvents,
  }));
  const likes = useQuery(() => ({
    queryKey: ["me", "likes"],
    enabled: signedIn() && tab() === "likes",
    queryFn: fetchLikedEvents,
  }));
  const hosted = useQuery(() => ({
    queryKey: ["me", "hosted", user()?.id],
    enabled: signedIn() && tab() === "hosted" && Boolean(user()?.id),
    queryFn: () => fetchHostedEvents(user()!.id),
  }));

  const active = createMemo(() => {
    const key = tab();
    if (key === "past") return past;
    if (key === "saved") return saved;
    if (key === "likes") return likes;
    if (key === "hosted") return hosted;
    return upcoming;
  });

  const signupRows = (): MyEvent[] => {
    if (tab() === "saved" || tab() === "likes" || tab() === "hosted") return [];
    return upcoming.data && tab() === "upcoming"
      ? upcoming.data.events
      : past.data && tab() === "past"
        ? past.data.events
        : [];
  };
  const eventRows = (): Event[] => {
    if (tab() === "saved") return saved.data?.events ?? [];
    if (tab() === "likes") return likes.data?.events ?? [];
    if (tab() === "hosted") return hosted.data?.events ?? [];
    return [];
  };

  const emptyCopy = () => {
    if (tab() === "saved") return t("myEvents.emptySaved");
    if (tab() === "likes") return t("myEvents.emptyLikes");
    if (tab() === "hosted") return t("myEvents.emptyHosted");
    return t("myEvents.emptyList");
  };

  return (
    <main>
      <header class="mb-2 flex items-center justify-between gap-2 px-4">
        <h1 class="m-0 text-2xl font-extrabold tracking-tight">{t("tabs.myEvents")}</h1>
        <Show when={signedIn() && canCreateEvents(user())}>
          <a
            href="/event/new"
            class="flex size-11 items-center justify-center rounded-full bg-accent text-accent-contrast"
            aria-label={t("editor.new")}
          >
            <Plus class="size-5" />
          </a>
        </Show>
      </header>
      <Show
        when={signedIn()}
        fallback={
          <p class="px-4 text-sm text-text-muted">
            <a href="/login?next=%2Fmy-events" class="font-semibold text-accent">
              {t("common.signIn")}
            </a>{" "}
            {t("myEvents.signInHint")}
          </p>
        }
      >
        <TabStrip value={tab()} onChange={setTab} />
        <Show when={active().isPending}>
          <p class="px-4 text-sm text-text-muted">{t("common.loading")}</p>
        </Show>
        <Show when={active().isError}>
          <StatusMessage kind="error" message={t("common.error")} onRetry={() => void active().refetch()} />
        </Show>
        <Show when={active().isSuccess}>
          <Show
            when={signupRows().length > 0 || eventRows().length > 0}
            fallback={<p class="px-4 py-8 text-center text-sm text-text-muted">{emptyCopy()}</p>}
          >
            <div class="flex flex-col">
              <For each={signupRows()} keyed={(row) => row.signup_id}>
                {(row) => (
                  <div>
                    <p class="m-0 px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-accent">{row().status}</p>
                    <EventCard event={row().event} />
                  </div>
                )}
              </For>
              <For each={eventRows()} keyed={(event) => event.id}>
                {(event) => (
                  <div>
                    <EventCard event={event()} />
                    <Show when={tab() === "hosted"}>
                      <div class="border-b border-divider px-4 pb-3">
                        <Button href={`/event/${encodeURIComponent(event().id)}/edit`} variant="secondary">
                          {t("editor.edit")}
                        </Button>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>
    </main>
  );
}
