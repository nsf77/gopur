import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMe } from "../lib/queries";
import { m } from "../paraglide/messages.js";
import { isSignedIn, useSessionStore } from "../stores/session";
import { AuthPrompt } from "../features/auth/AuthPrompt";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/Dialog";

export function ProfilePage() {
  const navigate = useNavigate();
  const signedIn = isSignedIn();
  const token = useSessionStore((s) => s.token);
  const user = useSessionStore((s) => s.user);
  const updateUser = useSessionStore((s) => s.updateUser);
  const signOut = useSessionStore((s) => s.signOut);
  const me = useMe(Boolean(token));
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (me.data) updateUser(me.data);
  }, [me.data, updateUser]);

  const profile = me.data ?? user;
  const name = profile?.display_name || profile?.username || m.profile_unknownUser();

  if (!signedIn) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-8">
        <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.profile_signInTitle()}</h1>
        <AuthPrompt next="/profile" message={m.profile_signInBody()} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-8">
      {me.isPending && !profile ? <p className="text-sm text-text-muted">{m.common_loading()}</p> : null}
      {profile ? (
        <section className="flex flex-col gap-3 rounded-xl border border-divider p-4">
          <div className="flex items-center gap-3">
            <Avatar name={name} src={profile.avatar_url} size="lg" />
            <div>
              <p className="m-0 font-semibold">{name}</p>
              {profile.username ? <p className="m-0 text-sm text-text-muted">@{profile.username}</p> : null}
              {profile.is_verified ? <p className="m-0 text-xs font-semibold text-accent">{m.profile_verified()}</p> : null}
            </div>
          </div>
          {profile.email ? (
            <p className="m-0 text-sm">
              {m.profile_email()}: {profile.email}
            </p>
          ) : null}
          <Link to="/profile/edit" className="text-sm font-semibold text-accent no-underline">
            {m.settings_editProfile()}
          </Link>
          <Link to="/settings" className="text-sm font-semibold text-accent no-underline">
            {m.settings_title()}
          </Link>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            {m.profile_signOut()}
          </Button>
        </section>
      ) : null}
      <ConfirmDialog
        open={dialogOpen}
        title={m.profile_signOut()}
        confirmLabel={m.common_signOut()}
        cancelLabel={m.common_back()}
        onOpenChange={setDialogOpen}
        onConfirm={() => {
          signOut();
          setDialogOpen(false);
          void navigate({ to: "/", replace: true });
        }}
      >
        {m.profile_signOutConfirm()}
      </ConfirmDialog>
    </main>
  );
}
