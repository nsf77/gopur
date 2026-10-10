import { useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { createEvent } from "../lib/api";
import { EMPTY_EVENT_DRAFT, draftToEventBody, type EventDraft } from "../lib/event-draft";
import { canCreateEvents, isSignedIn, sessionUser } from "../lib/session";
import { EventForm } from "../ui/EventForm";

export function NewEventPage() {
  const navigate = useNavigate();
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");
  const gate = () => {
    if (!isSignedIn()) return "anon" as const;
    if (!canCreateEvents(sessionUser())) return "verify" as const;
    return "form" as const;
  };

  const onSubmit = async (draft: EventDraft) => {
    setPending(true);
    setError("");
    try {
      const event = await createEvent(draftToEventBody(draft));
      navigate(`/event/${event.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <section>
      <h1 class="m-0 mb-4 text-2xl font-semibold tracking-tight">New event</h1>
      <Show when={gate() === "anon"}>
        <p class="text-sm text-slate-600">
          <a href="/signin" class="font-semibold text-accent">
            Sign in
          </a>{" "}
          to host an event.
        </p>
      </Show>
      <Show when={gate() === "verify"}>
        <p class="text-sm text-slate-600">Only verified accounts can create events.</p>
      </Show>
      <Show when={gate() === "form"}>
        <EventForm mode="create" initial={EMPTY_EVENT_DRAFT} pending={pending()} error={error()} onSubmit={(d) => void onSubmit(d)} />
      </Show>
    </section>
  );
}
