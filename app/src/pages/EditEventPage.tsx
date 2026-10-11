import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ApiError } from "../lib/api";
import { canEditEvent } from "../lib/access";
import { draftFromEvent, draftToEventBody } from "../lib/event-draft";
import { isNotFound, useEvent, useUpdateEvent } from "../lib/queries";
import { m } from "../paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../stores/session";
import { AuthPrompt } from "../features/auth/AuthPrompt";
import { EventForm } from "../features/event-editor/EventForm";
import { StatusMessage } from "../ui/StatusMessage";

export function EditEventPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const query = useEvent(id);
  const update = useUpdateEvent(id);
  const [error, setError] = useState("");
  const [clearError, setClearError] = useState("");

  if (!isSignedIn()) {
    return (
      <main className="mx-auto max-w-md">
        <h1 className="m-0 px-4 pt-2 text-2xl font-extrabold tracking-tight">{m.eventEditor_editTitle()}</h1>
        <AuthPrompt next={`/event/${id}/edit`} message={m.auth_signInRequired()} />
      </main>
    );
  }

  if (query.isPending) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="text-sm text-text-muted">{m.common_loading()}</p>
      </main>
    );
  }

  if (isNotFound(query.error) || query.isError || !query.data) {
    return (
      <main className="mx-auto max-w-md p-4">
        <StatusMessage kind="error" message={m.eventEditor_notFound()} />
      </main>
    );
  }

  const event = query.data;
  if (!canEditEvent(user, event)) {
    return (
      <main className="mx-auto max-w-md p-4">
        <StatusMessage kind="locked" message={event.imported ? m.eventEditor_importedCancel() : m.eventEditor_hostOnly()} />
      </main>
    );
  }

  const initial = draftFromEvent(event);

  return (
    <main className="mx-auto max-w-md pb-8">
      <h1 className="m-0 px-4 pt-2 text-2xl font-extrabold tracking-tight">{m.eventEditor_editTitle()}</h1>
      <EventForm
        mode="edit"
        initial={initial}
        lockedInitial={initial}
        pending={update.isPending}
        error={error || clearError}
        onClearBlocked={() => setClearError(m.eventEditor_cannotClear())}
        onSubmit={(draft) => {
          setError("");
          setClearError("");
          update.mutate(draftToEventBody(draft), {
            onSuccess: () => {
              if (window.history.length > 1) window.history.back();
              else void navigate({ to: "/event/$id", params: { id }, replace: true });
            },
            onError: (err) => {
              if (err instanceof ApiError && err.status === 403) setError(m.eventEditor_hostOnly());
              else setError(err instanceof Error ? err.message : String(err));
            },
          });
        }}
      />
    </main>
  );
}
