import { Link } from "@tanstack/react-router";
import { pipe, O } from "../lib/belt";
import { m } from "../paraglide/messages.js";
import { useSessionStore } from "../stores/session";
import { Button } from "../ui/Button";

export function ProfilePage() {
  const user = useSessionStore((s) => s.user);
  const signOut = useSessionStore((s) => s.signOut);
  const email = pipe(
    O.fromNullable(user?.email),
    O.mapWithDefault("", (value) => value),
  );

  if (!user) {
    return (
      <main className="grid gap-4 p-4">
        <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.profile_title()}</h1>
        <p className="m-0 text-sm text-text-muted">{m.profile_signedOut()}</p>
        <Button to="/login">{m.common_signIn()}</Button>
      </main>
    );
  }

  return (
    <main className="grid gap-4 p-4">
      <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.profile_title()}</h1>
      <p className="m-0 text-sm text-text-muted">{m.profile_signedInAs({ email })}</p>
      <Link to="/settings" className="text-sm font-semibold text-accent">
        {m.settings_title()}
      </Link>
      <Button variant="secondary" onClick={() => signOut()}>
        {m.common_signOut()}
      </Button>
    </main>
  );
}
