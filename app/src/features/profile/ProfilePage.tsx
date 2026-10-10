import { useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { O, pipe } from "../../lib/belt";
import { t } from "../../lib/i18n";
import { loginHref } from "../../lib/email";
import { currentUser, isSignedIn, signOut } from "../../lib/session";
import { useMe } from "../../lib/queries";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { ConfirmDialog } from "../../ui/Dialog";

export default function ProfilePage() {
  const navigate = useNavigate();
  const meQuery = useMe();
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const user = () =>
    pipe(
      currentUser(),
      O.match(
        (sessionUser) => meQuery.data ?? sessionUser,
        () => undefined,
      ),
    );

  return (
    <main class="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <Show
        when={isSignedIn()}
        fallback={
          <>
            <h1 class="m-0 text-2xl font-extrabold tracking-tight">{t("profile.signInTitle")}</h1>
            <p class="m-0 text-sm text-text-muted">{t("profile.signInBody")}</p>
            <Button href={loginHref("/profile")} class="min-h-11">
              {t("common.signIn")}
            </Button>
          </>
        }
      >
        <Show when={user()}>
          {(u) => {
            const name = () => u().display_name ?? u().username ?? t("profile.unknownUser");
            return (
              <section class="flex flex-col gap-3 rounded-xl border border-divider p-4">
                <div class="flex items-center gap-3">
                  <Avatar name={name()} src={u().avatar_url} size="lg" />
                  <div>
                    <p class="m-0 font-semibold">{name()}</p>
                    <Show when={u().username}>
                      <p class="m-0 text-sm text-text-muted">@{u().username}</p>
                    </Show>
                  </div>
                </div>
                <Show when={u().email}>
                  <p class="m-0 text-sm">
                    {t("profile.email")}: {u().email}
                  </p>
                </Show>
                <a class="text-sm font-semibold text-accent no-underline" href={`/user/${u().id}`}>
                  {t("profile.viewPublic")}
                </a>
                <Button href="/profile/edit" variant="secondary">
                  {t("settings.editProfile")}
                </Button>
                <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                  {t("profile.signOut")}
                </Button>
              </section>
            );
          }}
        </Show>
      </Show>
      <ConfirmDialog
        open={dialogOpen()}
        title={t("profile.signOut")}
        confirmLabel={t("profile.signOut")}
        cancelLabel={t("common.back")}
        onOpenChange={setDialogOpen}
        onConfirm={() => {
          signOut();
          setDialogOpen(false);
          navigate("/", { replace: true });
        }}
      >
        {t("profile.signOutConfirm")}
      </ConfirmDialog>
    </main>
  );
}
