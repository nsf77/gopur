import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { normalizeEmail, O, pipe, rememberLoginEmail, safeNext, startCooldown } from "@gopur/shared";
import { startEmailOtp } from "../../src/lib/api";
import { authStartError } from "../../src/lib/auth-error";
import { m } from "../../src/paraglide/messages.js";
import { isSignedIn } from "../../src/stores/session";
import { Button } from "../../src/ui/Button";
import { Screen } from "../../src/ui/Screen";
import { TextField } from "../../src/ui/TextField";

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safeNext(typeof params.next === "string" ? params.next : undefined);

  useEffect(() => {
    if (isSignedIn()) router.replace(target);
  }, [target, router]);

  return (
    <Screen>
      <View className="gap-3 px-4 pt-4">
        <Text className="text-2xl font-extrabold text-text">{m.auth_welcome()}</Text>
        <Text className="text-sm text-text-muted">{m.auth_subtitle()}</Text>
        {error ? (
          <Text className="text-sm text-accent" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <TextField
          label={m.auth_emailLabel()}
          placeholder={m.auth_emailPlaceholder()}
          value={email}
          keyboardType="email-address"
          autoComplete="email"
          error={emailError}
          onChangeText={(value) => {
            setEmail(value);
            setEmailError("");
            setError("");
          }}
        />
        <Button
          loading={busy}
          disabled={busy}
          label={busy ? m.common_loading() : m.auth_sendCode()}
          onPress={() => {
            const address = pipe(normalizeEmail(email), O.toNullable);
            if (!address) {
              setEmailError(m.auth_invalidEmail());
              return;
            }
            setBusy(true);
            void (async () => {
              try {
                await startEmailOtp(address);
                rememberLoginEmail(address);
                startCooldown(address);
                router.push(`/login/verify?email=${encodeURIComponent(address)}&next=${encodeURIComponent(target)}`);
              } catch (err: unknown) {
                setError(authStartError(err));
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      </View>
    </Screen>
  );
}
