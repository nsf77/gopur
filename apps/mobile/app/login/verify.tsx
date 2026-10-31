import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { cooldownRemaining, digitsOnlyCode, readLoginEmail, safeNext, startCooldown } from "@gopur/shared";
import { startEmailOtp, verifyEmailOtp } from "../../src/lib/api";
import { authStartError, authVerifyError } from "../../src/lib/auth-error";
import { queryClient } from "../../src/lib/query";
import { m } from "../../src/paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../../src/stores/session";
import { Button } from "../../src/ui/Button";
import { Screen } from "../../src/ui/Screen";
import { TextField } from "../../src/ui/TextField";

const OTP_LENGTH = 6;

export default function LoginVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; next?: string }>();
  const setSession = useSessionStore((s) => s.setSession);
  const email = readLoginEmail(typeof params.email === "string" ? params.email : undefined);
  const target = safeNext(typeof params.next === "string" ? params.next : undefined);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(() => cooldownRemaining(email));

  useEffect(() => {
    if (isSignedIn()) {
      router.replace(target);
      return;
    }
    if (!email) router.replace(`/login?next=${encodeURIComponent(target)}`);
  }, [email, target, router]);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(cooldownRemaining(email)), 500);
    return () => clearInterval(timer);
  }, [email]);

  const submit = (raw: string) => {
    const value = digitsOnlyCode(raw);
    if (value.length !== OTP_LENGTH) {
      setError(m.auth_codeIncomplete());
      return;
    }
    if (busy) return;
    setBusy(true);
    setError("");
    void verifyEmailOtp(email, value)
      .then((auth) => {
        setSession(auth);
        queryClient.clear();
        router.replace(target);
      })
      .catch((err: unknown) => {
        setError(authVerifyError(err));
        setCode("");
      })
      .finally(() => setBusy(false));
  };

  if (!email) return null;

  return (
    <Screen>
      <View className="gap-3 px-4 pt-4">
        <Text className="text-2xl font-extrabold text-text">{m.auth_verifyTitle()}</Text>
        <Text className="text-sm text-text-muted">{m.auth_verifySubtitle({ email })}</Text>
        {error ? (
          <Text className="text-sm text-accent" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <TextField
          label={m.auth_codeLabel()}
          value={code}
          keyboardType="numeric"
          onChangeText={(value) => {
            const next = digitsOnlyCode(value);
            setCode(next);
            setError("");
            if (next.length === OTP_LENGTH) submit(next);
          }}
        />
        <Button
          loading={busy}
          disabled={busy}
          label={busy ? m.common_loading() : m.auth_verifyButton()}
          onPress={() => submit(code)}
        />
        <Button
          variant="ghost"
          disabled={seconds > 0 || busy}
          label={seconds > 0 ? m.auth_resendIn({ seconds: String(seconds) }) : m.auth_resendCode()}
          onPress={() => {
            if (seconds > 0 || busy) return;
            void startEmailOtp(email)
              .then(() => {
                startCooldown(email);
                setSeconds(cooldownRemaining(email));
              })
              .catch((err: unknown) => setError(authStartError(err)));
          }}
        />
        <Pressable onPress={() => router.push(`/login?next=${encodeURIComponent(target)}`)}>
          <Text className="text-sm font-semibold text-accent">{m.auth_changeEmail()}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
