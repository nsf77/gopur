import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMe } from "../../src/lib/queries";
import { m } from "../../src/paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../../src/stores/session";
import { AuthPrompt } from "../../src/features/auth/AuthPrompt";
import { Avatar } from "../../src/ui/Avatar";
import { Button } from "../../src/ui/Button";
import { Screen } from "../../src/ui/Screen";

export default function ProfileScreen() {
  const router = useRouter();
  const signedIn = isSignedIn();
  const token = useSessionStore((s) => s.token);
  const user = useSessionStore((s) => s.user);
  const updateUser = useSessionStore((s) => s.updateUser);
  const signOut = useSessionStore((s) => s.signOut);
  const me = useMe(Boolean(token));

  useEffect(() => {
    if (me.data) updateUser(me.data);
  }, [me.data, updateUser]);

  const profile = me.data ?? user;
  const name = profile?.display_name || profile?.username || m.profile_unknownUser();

  if (!signedIn) {
    return (
      <Screen>
        <Text className="px-4 pt-4 text-2xl font-extrabold text-text">{m.profile_signInTitle()}</Text>
        <AuthPrompt next="/profile" message={m.profile_signInBody()} />
      </Screen>
    );
  }

  return (
    <Screen>
      {profile ? (
        <View className="m-4 gap-3 rounded-xl border border-divider p-4">
          <View className="flex-row items-center gap-3">
            <Avatar name={name} src={profile.avatar_url} size="lg" />
            <View>
              <Text className="font-semibold text-text">{name}</Text>
              {profile.username ? <Text className="text-sm text-text-muted">@{profile.username}</Text> : null}
              {profile.is_verified ? <Text className="text-xs font-semibold text-accent">{m.profile_verified()}</Text> : null}
            </View>
          </View>
          {profile.email ? (
            <Text className="text-sm text-text">
              {m.profile_email()}: {profile.email}
            </Text>
          ) : null}
          <Pressable onPress={() => router.push("/profile/edit")}>
            <Text className="text-sm font-semibold text-accent">{m.settings_editProfile()}</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/settings")}>
            <Text className="text-sm font-semibold text-accent">{m.settings_title()}</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/notifications")}>
            <Text className="text-sm font-semibold text-accent">{m.notifications_title()}</Text>
          </Pressable>
          <Button
            variant="secondary"
            label={m.profile_signOut()}
            onPress={() => {
              signOut();
              router.replace("/");
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}
