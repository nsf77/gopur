import { Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { t } from "../../lib/i18n";
import { isNotFound, useFollow, useUser } from "../../lib/queries";
import { isSignedIn } from "../../lib/session";
import { loginHref } from "../../lib/email";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { StatusMessage } from "../../ui/StatusMessage";

export default function UserProfilePage() {
  const params = useParams();
  const id = () => params.id ?? "";
  const query = useUser(id);
  const follow = useFollow(id);
  const following = () => query.data?.followed_by_me === true || query.data?.viewer_follow_status === "accepted";

  return (
    <main class="p-4">
      <Show
        when={isSignedIn()}
        fallback={
          <>
            <p>{t("profile.signInBody")}</p>
            <Button href={loginHref(`/user/${id()}`)}>{t("common.signIn")}</Button>
          </>
        }
      >
        <Show when={!isNotFound(query.error)} fallback={<StatusMessage kind="empty" message={t("profile.notFound")} />}>
          <Show when={query.data} fallback={<p class="text-sm text-text-muted">{t("common.loading")}</p>}>
            {(user) => {
              const name = () => user().display_name ?? user().username ?? t("profile.unknownUser");
              return (
                <section class="flex flex-col gap-3">
                  <div class="flex items-center gap-3">
                    <Avatar name={name()} src={user().avatar_url} size="lg" />
                    <div>
                      <h1 class="m-0 text-xl font-extrabold">{name()}</h1>
                      <Show when={user().username}>
                        <p class="m-0 text-sm text-text-muted">@{user().username}</p>
                      </Show>
                    </div>
                  </div>
                  <Show when={user().bio}>
                    <p class="text-sm">{user().bio}</p>
                  </Show>
                  <Button
                    variant={following() ? "secondary" : "primary"}
                    disabled={follow.isPending}
                    onClick={() => void follow.mutate(!following())}
                  >
                    {following() ? "Unfollow" : "Follow"}
                  </Button>
                </section>
              );
            }}
          </Show>
        </Show>
      </Show>
    </main>
  );
}
