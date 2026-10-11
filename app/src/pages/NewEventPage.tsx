import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ApiError } from "../lib/api";
import { canCreateEvents } from "../lib/access";
import { EMPTY_EVENT_DRAFT, draftToEventBody } from "../lib/event-draft";
import { useCreateEvent } from "../lib/queries";
import { m } from "../paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../stores/session";
import { AuthPrompt } from "../features/auth/AuthPrompt";
import { EventForm } from "../features/event-editor/EventForm";
import { StatusMessage } from "../ui/StatusMessage";

export function NewEventPage() {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const create = useCreateEvent();
  const [error, setError] = useState("");

  if (!isSignedIn()) {
    return (
      <main className="mx-auto max-w-md">
        <AuthPrompt next="/event/new" message={m.auth_signInRequired()} />
      </main>
    );
  }

  if (!canCreateEvents(user)) {
    return (
      <main className="mx-auto max-w-md p-4">
        <StatusMessage kind="locked" message={m.eventEditor_verifiedOnly()} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md pb-8">
      <h1 className="m-0 px-4 pt-2 text-2xl font-extrabold tracking-tight">{m.eventEditor_createTitle()}</h1>
      <EventForm
        mode="create"
        initial={EMPTY_EVENT_DRAFT}
        pending={create.isPending}
        error={error}
        onSubmit={(draft) => {
          setError("");
          create.mutate(draftToEventBody(draft), {
            onSuccess: (event) => {
              void navigate({ to: "/event/$id", params: { id: event.id }, replace: true });
            },
            onError: (err) => {
              if (err instanceof ApiError && err.status === 403) setError(m.eventEditor_verifiedOnly());
              else setError(err instanceof Error ? err.message : String(err));
            },
          });
        }}
      />
    </main>
  );
}
