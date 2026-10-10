import { useTabs } from "@ark-ui/solid/tabs";
import { useQuery } from "@tanstack/solid-query";
import type { Event, MyEvent } from "api";
import { For, Show, createMemo, createSignal } from "solid-js";
import Plus from "~icons/lucide/plus";
import { fetchHostedEvents, fetchLikedEvents, fetchMySignups, fetchSavedEvents } from "../lib/api";
import { canCreateEvents, isSignedIn, sessionUser } from "../lib/session";
import { EventCard } from "../ui/EventCard";

type TabKey = "upcoming" | "past" | "saved" | "likes" | "hosted";

const TAB_ITEMS: Array<{ value: TabKey; label: string }> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "saved", label: "Saved" },
  { value: "likes", label: "Likes" },
  { value: "hosted", label: "Hosted" },
];

function TabStrip(props: { value: TabKey; onChange: (value: TabKey) => void }) {
  const tabs = useTabs(() => ({
    id: "my-events-tabs",
    value: props.value,
    onValueChange: (details: { value: string | null }) => {
      if (details.value) props.onChange(details.value as TabKey);
    },
  }));
  return (
    <div {...tabs().getRootProps()} class="mb-4">
      <div {...tabs().getListProps()} class="glass-card flex gap-1 overflow-x-auto rounded-full p-1">
        <For each={TAB_ITEMS} keyed={(item) => item.value}>
          {(item) => {
            const selected = () => tabs().value === item().value;
            return (
              <button
                {...tabs().getTriggerProps({ value: item().value })}
                class={`min-h-10 shrink-0 rounded-full px-3 text-sm font-medium ${
                  selected() ? "bg-accent text-white" : "text-accent"
                }`}
              >
                {item().label}
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
}

export function MyEventsPage() {
  const [tab, setTab] = createSignal<TabKey>("upcoming");
  const signedIn = () => isSignedIn();
  const user = () => sessionUser();

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
    return (active().data as MyEvent[] | undefined) ?? [];
  };
  const eventRows = (): Event[] => {
    if (tab() !== "saved" && tab() !== "likes" && tab() !== "hosted") return [];
    return (active().data as Event[] | undefined) ?? [];
  };

  const emptyCopy = () => {
    if (tab() === "saved") return "No saved events.";
    if (tab() === "likes") return "No liked events.";
    if (tab() === "hosted") return "No hosted events yet.";
    return "No events in this list.";
  };

  return (
    <section>
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="m-0 text-2xl font-semibold tracking-tight">My events</h1>
        <Show when={signedIn() && canCreateEvents(user())}>
          <a href="/event/new" class="flex size-11 items-center justify-center rounded-full bg-accent text-white" aria-label="Create event">
            <Plus class="size-5" />
          </a>
        </Show>
      </header>
      <Show
        when={signedIn()}
        fallback={
          <p class="text-sm text-slate-600">
            <a href="/signin" class="font-semibold text-accent">
              Sign in
            </a>{" "}
            to see saved, liked, hosted, and joined events.
          </p>
        }
      >
        <TabStrip value={tab()} onChange={setTab} />
        <Show when={active().isPending}>
          <p class="text-sm text-slate-500">Loading…</p>
        </Show>
        <Show when={active().isError}>
          <p class="text-sm text-red-700">{String(active().error)}</p>
        </Show>
        <Show when={active().isSuccess}>
          <Show
            when={signupRows().length > 0 || eventRows().length > 0}
            fallback={<p class="py-8 text-center text-sm text-slate-500">{emptyCopy()}</p>}
          >
            <div class="flex flex-col gap-3">
              <For each={signupRows()} keyed={(row) => row.signup_id}>
                {(row) => (
                  <div>
                    <p class="m-0 mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-accent">{row().status}</p>
                    <EventCard event={row().event} />
                  </div>
                )}
              </For>
              <For each={eventRows()} keyed={(event) => event.id}>
                {(event) => (
                  <EventCard
                    event={event()}
                    href={tab() === "hosted" ? `/event/${encodeURIComponent(event().id)}/edit` : undefined}
                  />
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>
    </section>
  );
}
