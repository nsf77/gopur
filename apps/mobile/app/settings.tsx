import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getLocale, setLocale } from "../src/paraglide/runtime.js";
import { m } from "../src/paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../src/stores/session";
import { usePatchMe } from "../src/lib/queries";
import { setThemePreference, themePreference, type ThemePreference } from "../src/lib/theme";
import { Button } from "../src/ui/Button";
import { Screen } from "../src/ui/Screen";

function Option(props: { selected: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} className="min-h-11 justify-center rounded-xl px-2">
      <Text className={props.selected ? "font-bold text-accent" : "text-text"}>{props.label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const signedIn = isSignedIn();
  const signOut = useSessionStore((s) => s.signOut);
  const patchMe = usePatchMe();
  const locale = getLocale();
  const [theme, setTheme] = useState<ThemePreference>(() => themePreference());

  return (
    <Screen>
      <View className="gap-2 p-4">
        <Text className="text-base font-bold text-text">{m.settings_appearance_title()}</Text>
        {(["system", "light", "dark"] as const).map((value) => (
          <Option
            key={value}
            selected={theme === value}
            label={
              value === "system"
                ? m.settings_appearance_system()
                : value === "light"
                  ? m.settings_appearance_light()
                  : m.settings_appearance_dark()
            }
            onPress={() => {
              setTheme(value);
              setThemePreference(value);
            }}
          />
        ))}
      </View>
      <View className="gap-2 p-4">
        <Text className="text-base font-bold text-text">{m.settings_language()}</Text>
        <Text className="text-sm text-text-muted">{m.settings_languageHint()}</Text>
        <Option
          selected={locale === "zh-Hant"}
          label={m.settings_languageZh()}
          onPress={() => {
            setLocale("zh-Hant");
            if (signedIn) patchMe.mutate({ language: "zh-Hant" });
          }}
        />
        <Option
          selected={locale === "en"}
          label={m.settings_languageEn()}
          onPress={() => {
            setLocale("en");
            if (signedIn) patchMe.mutate({ language: "en" });
          }}
        />
      </View>
      {signedIn ? (
        <View className="gap-2 p-4">
          <Text className="text-base font-bold text-text">{m.settings_account()}</Text>
          <Pressable onPress={() => router.push("/profile/edit")}>
            <Text className="font-semibold text-accent">{m.settings_editProfile()}</Text>
          </Pressable>
          <Button
            variant="secondary"
            label={m.settings_signOut()}
            onPress={() => {
              signOut();
              router.replace("/");
            }}
          />
        </View>
      ) : null}
      <View className="p-4">
        <View className="rounded-lg bg-surface-elevated p-4">
          <Text className="text-sm text-text">{m.settings_glassPreview()}</Text>
        </View>
      </View>
    </Screen>
  );
}
