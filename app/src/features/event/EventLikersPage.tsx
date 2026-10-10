import { For, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { A, O, pipe } from "../../lib/belt";
import { t } from "../../lib/i18n";
import { useLikers } from "../../lib/queries";
import { Avatar } from "../../ui/Avatar";
import { InfiniteSentinel } from "../../ui/InfiniteSentinel";

export default function EventLikersPage() {
  const params = useParams();
  const id = () => params.id ?? "";
  const query = useLikers(id);
  const users = () =>
    pipe(
      O.fromNullable(query.data?.pages),
      O.map((pages) => [...A.flat(A.map(pages, (page) => page.users))]),
      O.getWithDefault([] as { id: string; display_name?: string; username?: string; avatar_url?: string }[]),
    );

  return (
    <main class="px-4">
      <h1 class="text-lg font-bold">{t("viewer.likers")}</h1>
      <Show when={query.isPending && users().length === 0}>
        <p class="text-sm text-text-muted">{t("common.loading")}</p>
      </Show>
      <For each={users()} keyed={(u) => u.id}>
        {(user) => (
          <a href={`/user/${user().id}`} class="flex min-h-11 items-center gap-3 border-b border-divider py-3 text-inherit no-underline">
            <Avatar name={user().display_name ?? user().username ?? user().id} src={user().avatar_url} size="sm" />
            <span class="font-semibold">{user().display_name ?? user().username ?? user().id}</span>
          </a>
        )}
      </For>
      <InfiniteSentinel
        hasNextPage={Boolean(query.hasNextPage)}
        isFetchingNextPage={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
      />
    </main>
  );
}
