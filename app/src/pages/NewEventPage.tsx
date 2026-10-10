import { useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { createEvent } from "../lib/api";
import { O } from "../lib/belt";
import { EMPTY_EVENT_DRAFT, draftToEventBody, type EventDraft } from "../lib/event-draft";
import { t } from "../lib/i18n";
import { canCreateEvents, currentUser, isSignedIn } from "../lib/session";
import { EventForm } from "../ui/EventForm";

export default function NewEventPage() {
  const navigate = useNavigate();
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");
  const gate = () => {
    if (!isSignedIn()) return "anon" as const;
    if (!canCreateEvents(O.toNullable(currentUser()))) return "verify" as const;
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
    <main class="px-4 pb-8">
      <h1 class="m-0 mb-4 text-2xl font-extrabold tracking-tight">{t("editor.new")}</h1>
      <Show when={gate() === "anon"}>
        <p class="text-sm text-text-muted">
          <a href="/login?next=%2Fevent%2Fnew" class="font-semibold text-accent">
            {t("common.signIn")}
          </a>{" "}
          {t("editor.signInHint")}
        </p>
      </Show>
      <Show when={gate() === "verify"}>
        <p class="text-sm text-text-muted">{t("editor.verifyHint")}</p>
      </Show>
      <Show when={gate() === "form"}>
        <EventForm mode="create" initial={EMPTY_EVENT_DRAFT} pending={pending()} error={error()} onSubmit={(d) => void onSubmit(d)} />
      </Show>
    </main>
  );
}
