import { Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { t } from "../../lib/i18n";
import { isNotFound, useOrganizer } from "../../lib/queries";
import { StatusMessage } from "../../ui/StatusMessage";

export default function OrganizerPage() {
  const params = useParams();
  const key = () => params.key ?? "";
  const query = useOrganizer(key);

  return (
    <main class="p-4">
      <Show when={!isNotFound(query.error)} fallback={<StatusMessage kind="empty" message={t("event.notFound")} />}>
        <Show when={query.data} fallback={<p class="text-sm text-text-muted">{t("common.loading")}</p>}>
          {(org) => (
            <section>
              <h1 class="m-0 text-2xl font-extrabold">{org().name}</h1>
              <p class="mt-2 text-sm text-text-muted">{t("discover.upcomingCount", { count: org().upcoming_count })}</p>
            </section>
          )}
        </Show>
      </Show>
    </main>
  );
}
