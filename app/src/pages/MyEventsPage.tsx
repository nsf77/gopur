import { Link } from "@tanstack/react-router";
import { PlusIcon } from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { canCreateEvents } from "../lib/access";
import { useLikedEvents, useMyEvents, useSavedEvents } from "../lib/queries";
import { m } from "../paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../stores/session";
import { AuthPrompt } from "../features/auth/AuthPrompt";
import { EventCard } from "../features/feed/EventCard";
import { Button } from "../ui/Button";
import { StatusMessage } from "../ui/StatusMessage";
import { Tabs } from "../ui/Tabs";

const tabParser = parseAsStringLiteral(["upcoming", "past", "saved", "likes"] as const).withDefault("upcoming");

function statusLabel(status: string): string {
  if (status === "pending") return m.myEvents_status_pending();
  if (status === "confirmed") return m.myEvents_status_confirmed();
  if (status === "waitlisted") return m.myEvents_status_waitlisted();
  if (status === "attended") return m.myEvents_status_attended();
  if (status === "no_show") return m.myEvents_status_no_show();
  if (status === "cancelled") return m.myEvents_status_cancelled();
  if (status === "declined") return m.myEvents_status_declined();
  return status;
}

export function MyEventsPage() {
  const [tab, setTab] = useQueryState("tab", tabParser);
  const user = useSessionStore((s) => s.user);
  const signedIn = isSignedIn();
  const upcoming = useMyEvents("upcoming", signedIn && tab === "upcoming");
  const past = useMyEvents("past", signedIn && tab === "past");
  const saved = useSavedEvents(signedIn && tab === "saved");
  const likes = useLikedEvents(signedIn && tab === "likes");
  const active = tab === "saved" ? saved : tab === "likes" ? likes : tab === "past" ? past : upcoming;
  const signupRows = tab === "upcoming" ? (upcoming.data?.events ?? []) : tab === "past" ? (past.data?.events ?? []) : [];
  const eventRows = tab === "saved" ? (saved.data?.events ?? []) : tab === "likes" ? (likes.data?.events ?? []) : [];
  const empty =
    tab === "saved" ? m.myEvents_savedEmpty() : tab === "likes" ? m.myEvents_likesEmpty() : m.myEvents_empty();

  return (
    <main className="mx-auto max-w-md pb-8">
      <header className="flex items-center justify-between gap-2 px-4 pt-2">
        <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.myEvents_title()}</h1>
        {signedIn && canCreateEvents(user) ? (
          <Link
            to="/event/new"
            className="flex size-11 items-center justify-center rounded-full"
            aria-label={m.myEvents_create()}
            data-testid="create-event"
          >
            <PlusIcon className="size-5" />
          </Link>
        ) : null}
      </header>
      {!signedIn ? (
        <AuthPrompt next="/my-events" message={m.myEvents_signIn()} />
      ) : (
        <Tabs
          aria-label={m.myEvents_title()}
          value={tab}
          onValueChange={(value) =>
            void setTab(
              value === "past" || value === "saved" || value === "likes" ? value : "upcoming",
            )
          }
          items={[
            { value: "upcoming", label: m.myEvents_upcoming(), content: null },
            { value: "past", label: m.myEvents_past(), content: null },
            { value: "saved", label: m.myEvents_saved(), content: null },
            { value: "likes", label: m.myEvents_likes(), content: null },
          ]}
        />
      )}
      {signedIn && active.isPending ? <p className="p-4 text-sm text-text-muted">{m.common_loading()}</p> : null}
      {signedIn && active.isError ? (
        <StatusMessage kind="error" message={m.common_error()} onRetry={() => void active.refetch()} />
      ) : null}
      {signedIn && active.isSuccess && signupRows.length === 0 && eventRows.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
          <StatusMessage kind="empty" message={empty} />
          <Button to="/explore">{m.myEvents_browse()}</Button>
        </div>
      ) : null}
      {signedIn && active.isSuccess ? (
        <div className="flex flex-col gap-3">
          {signupRows.map((row) => (
            <div key={row.signup_id}>
              <p className="m-0 px-4 pb-1 text-sm font-semibold text-accent">{statusLabel(row.status)}</p>
              <EventCard event={row.event} />
            </div>
          ))}
          {eventRows.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : null}
    </main>
  );
}
