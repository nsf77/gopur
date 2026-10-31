import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { changedProfileFields, formFromUser, ProfileEditSchema } from "@gopur/shared";
import * as v from "valibot";
import { useMe, usePatchMe } from "../../src/lib/queries";
import { m } from "../../src/paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../../src/stores/session";
import { AuthPrompt } from "../../src/features/auth/AuthPrompt";
import { Button } from "../../src/ui/Button";
import { Screen } from "../../src/ui/Screen";
import { TextField } from "../../src/ui/TextField";

export default function ProfileEditScreen() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const me = useMe(isSignedIn());
  const patch = usePatchMe();
  const profile = me.data ?? user;
  const [form, setForm] = useState(() => (profile ? formFromUser(profile) : null));
  const [error, setError] = useState("");

  if (!isSignedIn()) {
    return (
      <Screen>
        <AuthPrompt next="/profile/edit" message={m.auth_signInRequired()} />
      </Screen>
    );
  }
  if (!profile || !form) {
    return (
      <Screen>
        <Text className="p-4 text-sm text-text-muted">{m.common_loading()}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {error ? <Text className="px-4 pt-2 text-sm text-accent">{error}</Text> : null}
      <View className="gap-3 px-4 py-4">
        <TextField label={m.profileEdit_displayName()} value={form.display_name} onChangeText={(display_name) => setForm({ ...form, display_name })} />
        <TextField label={m.profileEdit_username()} value={form.username} onChangeText={(username) => setForm({ ...form, username })} />
        <TextField label={m.profileEdit_email()} value={form.email} keyboardType="email-address" onChangeText={(email) => setForm({ ...form, email })} />
        <TextField label={m.profileEdit_phone()} value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} />
        <TextField label={m.profileEdit_avatarUrl()} value={form.avatar_url} keyboardType="url" onChangeText={(avatar_url) => setForm({ ...form, avatar_url })} />
        <TextField label={m.profileEdit_bio()} value={form.bio} multiline onChangeText={(bio) => setForm({ ...form, bio })} />
        <Button
          label={form.is_private ? m.profileEdit_private() : m.profileEdit_private()}
          variant={form.is_private ? "primary" : "secondary"}
          onPress={() => setForm({ ...form, is_private: !form.is_private })}
        />
        <Button
          loading={patch.isPending}
          label={m.profileEdit_save()}
          onPress={() => {
            const parsed = v.safeParse(ProfileEditSchema, form);
            if (!parsed.success) {
              setError(m.profileEdit_invalidEmail());
              return;
            }
            patch.mutate(changedProfileFields(formFromUser(profile), parsed.output), {
              onSuccess: () => router.back(),
              onError: () => setError(m.common_error()),
            });
          }}
        />
      </View>
    </Screen>
  );
}
