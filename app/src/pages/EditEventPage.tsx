import { useParams } from "@solidjs/router";
import { useQuery } from "@tanstack/solid-query";
import { Show, createSignal } from "solid-js";
import { fetchEvent, updateEvent } from "../lib/api";
import { draftFromEvent, draftToEventBody, isEventHost, type EventDraft } from "../lib/event-draft";
import { isSignedIn, sessionUser } from "../lib/session";
import { EventForm } from "../ui/EventForm";

export function EditEventPage() {
  const params = useParams();
  const eventId = () => params.id ?? "";
  const query = useQuery(() => ({
    queryKey: ["event", eventId()],
    enabled: isSignedIn() && Boolean(eventId()),
    queryFn: () => fetchEvent(eventId()),
  }));
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");

  const onSubmit = async (draft: EventDraft) => {
    setPending(true);
    setError("");
    try {
      await updateEvent(eventId(), draftToEventBody(draft));
      window.history.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const viewer = () => sessionUser();
  const event = () => query.data;
  const canEdit = () => {
    const ev = event();
    const u = viewer();
    if (!ev || !u) return false;
    return isEventHost(u.id, ev) || u.role === "admin";
  };

  return (
    <section>
      <h1 class="m-0 mb-4 text-2xl font-semibold tracking-tight">Edit event</h1>
      <Show when={!isSignedIn()}>
        <p class="text-sm text-slate-600">
          <a href="/signin" class="font-semibold text-accent">
            Sign in
          </a>{" "}
          to edit this event.
        </p>
      </Show>
      <Show when={isSignedIn() && query.isPending}>
        <p class="text-sm text-slate-500">Loading…</p>
      </Show>
      <Show when={isSignedIn() && query.isError}>
        <p class="text-sm text-red-700">Event not found.</p>
      </Show>
      <Show when={event()}>
        {(ev) => (
          <Show
            when={canEdit() && !ev().imported}
            fallback={
              <p class="text-sm text-slate-600">
                {ev().imported ? "Imported events cannot be edited." : "Only the event host can update this event."}
              </p>
            }
          >
            <EventForm
              mode="edit"
              initial={draftFromEvent(ev())}
              pending={pending()}
              error={error()}
              onSubmit={(d) => void onSubmit(d)}
            />
          </Show>
        )}
      </Show>
    </section>
  );
}
