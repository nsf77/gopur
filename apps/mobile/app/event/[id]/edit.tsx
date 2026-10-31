import { Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { canEditEvent, draftFromEvent, draftToEventBody } from "@gopur/shared";
import { isNotFound, useEvent, useUpdateEvent } from "../../../src/lib/queries";
import { EventForm } from "../../../src/features/event-editor/EventForm";
import { m } from "../../../src/paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../../../src/stores/session";
import { AuthPrompt } from "../../../src/features/auth/AuthPrompt";
import { Screen } from "../../../src/ui/Screen";
import { StatusMessage } from "../../../src/ui/StatusMessage";

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const query = useEvent(id ?? "");
  const update = useUpdateEvent(id ?? "");

  if (!isSignedIn()) {
    return (
      <Screen>
        <AuthPrompt next={`/event/${id}/edit`} message={m.auth_signInRequired()} />
      </Screen>
    );
  }
  if (isNotFound(query.error)) {
    return (
      <Screen>
        <Text className="p-4">{m.eventEditor_notFound()}</Text>
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <Screen>
        <StatusMessage kind="error" message={m.common_error()} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  if (!query.data) {
    return (
      <Screen>
        <Text className="p-4 text-sm text-text-muted">{m.common_loading()}</Text>
      </Screen>
    );
  }
  if (!canEditEvent(user, query.data)) {
    return (
      <Screen>
        <Text className="p-4 text-sm text-text-muted">{m.eventEditor_hostOnly()}</Text>
      </Screen>
    );
  }
  const initial = draftFromEvent(query.data);
  return (
    <Screen>
      <EventForm
        initial={initial}
        lockedInitial={initial}
        mode="edit"
        pending={update.isPending}
        error={update.isError ? m.common_error() : undefined}
        onClearBlocked={() => undefined}
        onSubmit={(draft) => {
          update.mutate(draftToEventBody(draft), {
            onSuccess: () => router.replace(`/event/${id}`),
          });
        }}
      />
    </Screen>
  );
}
