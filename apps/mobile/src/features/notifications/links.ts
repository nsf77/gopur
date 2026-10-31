import { G, O, pipe } from "@gopur/shared";
import type { Notification } from "@gopur/shared";

const EVENT_TYPES = new Set([
  "event_reminder",
  "join_approved",
  "join_declined",
  "waitlist_promoted",
  "event_updated",
  "event_cancelled",
  "join_request",
]);

const VERIFICATION_TYPES = new Set(["verification_approved", "verification_rejected"]);

function readString(value: unknown): O.Option<string> {
  if (!G.isString(value)) return O.None;
  const trimmed = value.trim();
  return trimmed.length > 0 ? O.Some(trimmed) : O.None;
}

export function notificationHref(item: Notification): O.Option<string> {
  const type = item.type;
  const eventId = readString(item.data.event_id);
  if (EVENT_TYPES.has(type)) {
    return pipe(
      eventId,
      O.map((id) => `/event/${encodeURIComponent(id)}`),
    );
  }
  if (VERIFICATION_TYPES.has(type)) return O.Some("/profile");
  return pipe(
    readString(item.data.conversation_id),
    O.map((id) => `/chat/${id}`),
  );
}
