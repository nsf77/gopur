import { useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { fetchMe, startEmail, verifyEmail } from "../lib/api";
import { setSession } from "../lib/session";

export function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [code, setCode] = createSignal("");
  const [birthdate, setBirthdate] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [message, setMessage] = createSignal("");
  const [error, setError] = createSignal("");

  const send = async () => {
    setPending(true);
    setError("");
    try {
      const res = await startEmail(email());
      setMessage("message" in res ? String((res as { message: string }).message) : "Code sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const verify = async () => {
    setPending(true);
    setError("");
    try {
      const res = await verifyEmail(email(), code(), birthdate() || undefined);
      const body = res as { token: string; user: Parameters<typeof setSession>[1] };
      setSession(body.token, body.user);
      await fetchMe(body.token).then((user) => setSession(body.token, user));
      navigate("/my-events", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <section class="flex flex-col gap-3">
      <h1 class="m-0 text-2xl font-semibold tracking-tight">Sign in</h1>
      <label class="text-sm font-semibold">Email</label>
      <input
        class="min-h-11 rounded-xl border border-white/40 bg-white/70 px-3 py-2"
        type="email"
        value={email()}
        onInput={(e) => setEmail(e.currentTarget.value)}
      />
      <button
        type="button"
        class="min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
        disabled={pending() || !email()}
        onClick={() => void send()}
      >
        Send code
      </button>
      <label class="text-sm font-semibold">Code</label>
      <input
        class="min-h-11 rounded-xl border border-white/40 bg-white/70 px-3 py-2"
        value={code()}
        onInput={(e) => setCode(e.currentTarget.value)}
      />
      <label class="text-sm font-semibold">Birthdate (new accounts)</label>
      <input
        class="min-h-11 rounded-xl border border-white/40 bg-white/70 px-3 py-2"
        placeholder="YYYY-MM-DD"
        value={birthdate()}
        onInput={(e) => setBirthdate(e.currentTarget.value)}
      />
      <button
        type="button"
        class="min-h-11 rounded-full border border-accent px-4 text-sm font-semibold text-accent disabled:opacity-50"
        disabled={pending() || !email() || !code()}
        onClick={() => void verify()}
      >
        Verify
      </button>
      {message() ? <p class="m-0 text-sm text-slate-600">{message()}</p> : null}
      {error() ? (
        <p class="m-0 text-sm text-red-700" role="alert">
          {error()}
        </p>
      ) : null}
    </section>
  );
}
