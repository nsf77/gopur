import { useNavigate, useRouter } from "@tanstack/react-router";
import { m } from "../paraglide/messages.js";
import { useSessionStore } from "../stores/session";
import { Button } from "../ui/Button";
import { OtpField } from "../ui/OtpField";

export function LoginVerifyPage({ email, next }: { email: string; next?: string }) {
  const navigate = useNavigate();
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);

  return (
    <main className="grid gap-4 p-4">
      <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.auth_verifyTitle()}</h1>
      <p className="m-0 text-sm text-text-muted">{email}</p>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <OtpField
          label={m.auth_codeLabel()}
          onValueComplete={() => {
            setSession("stub-token", {
              id: "stub",
              language: "en",
              age: null,
              is_teen: false,
              is_private: false,
              is_verified: false,
              imported: false,
              needs_onboarding: false,
              onboarding_missing: [],
              credit_score: 0,
              role: "user",
              email: email || "stub@gopur.local",
            });
            if (next?.startsWith("/")) router.history.push(next);
            else void navigate({ to: "/profile" });
          }}
        />
        <Button type="submit">{m.auth_verifyButton()}</Button>
      </form>
    </main>
  );
}
