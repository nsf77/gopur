import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { canCreateEvents } from "@gopur/shared";
import { useLikedEvents, useMyEvents, useSavedEvents } from "../../src/lib/queries";
import { EventCard } from "../../src/features/feed/EventCard";
import { AuthPrompt } from "../../src/features/auth/AuthPrompt";
import { Screen } from "../../src/ui/Screen";
import { StatusMessage } from "../../src/ui/StatusMessage";
import { m } from "../../src/paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../../src/stores/session";

const tabs = ["upcoming", "past", "saved", "likes"] as const;
type Tab = (typeof tabs)[number];

export default function MyEventsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upcoming");
  const user = useSessionStore((s) => s.user);
  const signedIn = isSignedIn();
  const upcoming = useMyEvents("upcoming", signedIn && tab === "upcoming");
  const past = useMyEvents("past", signedIn && tab === "past");
  const saved = useSavedEvents(signedIn && tab === "saved");
  const likes = useLikedEvents(signedIn && tab === "likes");
  const active = tab === "saved" ? saved : tab === "likes" ? likes : tab === "past" ? past : upcoming;
  const signupRows = tab === "upcoming" ? (upcoming.data?.events ?? []) : tab === "past" ? (past.data?.events ?? []) : [];
  const eventRows = tab === "saved" ? (saved.data?.events ?? []) : tab === "likes" ? (likes.data?.events ?? []) : [];

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 pt-2">
        <Text className="text-2xl font-extrabold text-text">{m.myEvents_title()}</Text>
        {signedIn && canCreateEvents(user) ? (
          <Pressable onPress={() => router.push("/event/new")}>
            <Text className="text-accent">{m.myEvents_create()}</Text>
          </Pressable>
        ) : null}
      </View>
      {!signedIn ? (
        <AuthPrompt next="/my-events" message={m.myEvents_signIn()} />
      ) : (
        <View className="flex-row flex-wrap gap-2 px-4 py-3">
          {tabs.map((item) => (
            <Pressable key={item} onPress={() => setTab(item)}>
              <Text className={tab === item ? "font-bold text-accent" : "text-text-muted"}>
                {item === "upcoming"
                  ? m.myEvents_upcoming()
                  : item === "past"
                    ? m.myEvents_past()
                    : item === "saved"
                      ? m.myEvents_saved()
                      : m.myEvents_likes()}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {signedIn && active.isError ? (
        <StatusMessage kind="error" message={m.common_error()} onRetry={() => void active.refetch()} />
      ) : null}
      {signedIn && active.isSuccess && signupRows.length === 0 && eventRows.length === 0 ? (
        <StatusMessage kind="empty" message={tab === "saved" ? m.myEvents_savedEmpty() : tab === "likes" ? m.myEvents_likesEmpty() : m.myEvents_empty()} />
      ) : null}
      {signupRows.map((row) => (
        <EventCard key={row.signup_id} event={row.event} />
      ))}
      {eventRows.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </Screen>
  );
}
