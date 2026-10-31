import { Text } from "react-native";
import { useRouter } from "expo-router";
import { EMPTY_EVENT_DRAFT, canCreateEvents, draftToEventBody } from "@gopur/shared";
import { useCreateEvent } from "../../src/lib/queries";
import { EventForm } from "../../src/features/event-editor/EventForm";
import { m } from "../../src/paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../../src/stores/session";
import { AuthPrompt } from "../../src/features/auth/AuthPrompt";
import { Screen } from "../../src/ui/Screen";

export default function NewEventScreen() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const create = useCreateEvent();
  if (!isSignedIn()) {
    return (
      <Screen>
        <AuthPrompt next="/event/new" message={m.auth_signInRequired()} />
      </Screen>
    );
  }
  if (!canCreateEvents(user)) {
    return (
      <Screen>
        <Text className="p-4 text-sm text-text-muted">{m.eventEditor_verifiedOnly()}</Text>
      </Screen>
    );
  }
  return (
    <Screen>
      <EventForm
        initial={EMPTY_EVENT_DRAFT}
        mode="create"
        pending={create.isPending}
        error={create.isError ? m.common_error() : undefined}
        onSubmit={(draft) => {
          create.mutate(draftToEventBody(draft), {
            onSuccess: (event) => router.replace(`/event/${event.id}`),
          });
        }}
      />
    </Screen>
  );
}
