import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchMe } from "../lib/api";
import { pipe, O } from "../lib/belt";
import { m } from "../paraglide/messages.js";
import { useSessionStore } from "../stores/session";
import { Button } from "../ui/Button";

export function ProfilePage() {
  const token = useSessionStore((s) => s.token);
  const user = useSessionStore((s) => s.user);
  const updateUser = useSessionStore((s) => s.updateUser);
  const signOut = useSessionStore((s) => s.signOut);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: Boolean(token),
  });
  useEffect(() => {
    if (me.data) updateUser(me.data);
  }, [me.data, updateUser]);
  const email = pipe(
    O.fromNullable(me.data?.email ?? user?.email),
    O.mapWithDefault("", (value) => value),
  );

  if (!token || !user) {
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
