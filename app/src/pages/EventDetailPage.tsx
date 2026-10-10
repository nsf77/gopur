import { useParams } from "@solidjs/router";
import { useQuery } from "@tanstack/solid-query";
import { Show } from "solid-js";
import { fetchEvent } from "../lib/api";
import { isEventHost } from "../lib/event-draft";
import { sessionUser } from "../lib/session";

export function EventDetailPage() {
  const params = useParams();
  const eventId = () => params.id ?? "";
  const query = useQuery(() => ({
    queryKey: ["event", eventId()],
    enabled: Boolean(eventId()),
    queryFn: () => fetchEvent(eventId()),
  }));
  const viewer = () => sessionUser();

  return (
    <section>
      <Show when={query.isPending}>
        <p class="text-sm text-slate-500">Loading…</p>
      </Show>
      <Show when={query.isError}>
        <p class="text-sm text-red-700">Event not found.</p>
      </Show>
      <Show when={query.data}>
        {(event) => (
          <div class="glass-card rounded-2xl p-4">
            <h1 class="m-0 text-2xl font-semibold tracking-tight">{event().title}</h1>
            <p class="mt-2 text-sm text-slate-600">
              {event().start_at} – {event().end_at}
            </p>
            <p class="mt-2 text-sm text-slate-600">{event().location}</p>
            <p class="mt-4 whitespace-pre-wrap text-sm text-slate-800">{event().description}</p>
            <Show when={viewer() && (isEventHost(viewer()?.id, event()) || viewer()?.role === "admin") && !event().imported}>
              <a href={`/event/${encodeURIComponent(event().id)}/edit`} class="mt-4 inline-block font-semibold text-accent">
                Edit event
              </a>
            </Show>
          </div>
        )}
      </Show>
    </section>
  );
}
