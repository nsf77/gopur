import { useParams } from "@solidjs/router";
import { useQuery } from "@tanstack/solid-query";
import { Show, createSignal } from "solid-js";
import { fetchEvent, updateEvent } from "../lib/api";
import { O } from "../lib/belt";
import { draftFromEvent, draftToEventBody, isEventHost, type EventDraft } from "../lib/event-draft";
import { t } from "../lib/i18n";
import { currentUser, isSignedIn } from "../lib/session";
import { EventForm } from "../ui/EventForm";

export default function EditEventPage() {
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

  const viewer = () => O.toNullable(currentUser());
  const event = () => query.data;
  const canEdit = () => {
    const ev = event();
    const u = viewer();
    if (!ev || !u) return false;
    return isEventHost(u.id, ev) || u.role === "admin";
  };

  return (
    <main class="px-4 pb-8">
      <h1 class="m-0 mb-4 text-2xl font-extrabold tracking-tight">{t("editor.edit")}</h1>
      <Show when={!isSignedIn()}>
        <p class="text-sm text-text-muted">
          <a href={`/login?next=${encodeURIComponent(`/event/${eventId()}/edit`)}`} class="font-semibold text-accent">
            {t("common.signIn")}
          </a>{" "}
          {t("editor.signInHint")}
        </p>
      </Show>
      <Show when={isSignedIn() && query.isPending}>
        <p class="text-sm text-text-muted">{t("common.loading")}</p>
      </Show>
      <Show when={isSignedIn() && query.isError}>
        <p class="text-sm text-text-muted">{t("event.notFound")}</p>
      </Show>
      <Show when={event()}>
        {(ev) => (
          <Show
            when={canEdit() && !ev().imported}
            fallback={
              <p class="text-sm text-text-muted">
                {ev().imported ? t("editor.importedLocked") : t("editor.hostOnly")}
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
    </main>
  );
}
