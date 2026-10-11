import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../lib/api";
import { m } from "../paraglide/messages.js";
import { StatusMessage } from "../ui/StatusMessage";

export function HomePage() {
  const health = useQuery({
    queryKey: ["healthz"],
    queryFn: fetchHealth,
  });

  return (
    <main className="p-4">
      <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.home_title()}</h1>
      {health.isPending ? <p className="mt-3 text-sm text-text-muted">{m.common_loading()}</p> : null}
      {health.isError ? (
        <StatusMessage kind="error" message={m.home_apiDown()} onRetry={() => void health.refetch()} />
      ) : null}
      {health.data?.ok ? <p className="mt-3 text-sm text-text-muted">{m.home_apiOk()}</p> : null}
    </main>
  );
}
