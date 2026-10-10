import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/solid-query";
import { Loading } from "@solidjs/web";
import HeartPulse from "~icons/lucide/heart-pulse";
import { A, O, pipe } from "@mobily/ts-belt";
import { fetchFeed, fetchHealth, feedTitles } from "./lib/api";

const queryClient = new QueryClient();

function HealthStatus() {
  const health = useQuery(() => ({
    queryKey: ["healthz"],
    queryFn: () => fetchHealth(),
  }));

  const ok = pipe(O.fromNullable(health.data), O.mapWithDefault(false, (d) => Boolean(d.ok)));

  return (
    <p class="mt-4 text-lg">
      API health: {ok ? "ok" : "down"}
    </p>
  );
}

function FeedPreview() {
  const feed = useQuery(() => ({
    queryKey: ["feed"],
    queryFn: () => fetchFeed(),
  }));

  const titles = pipe(
    O.fromNullable(feed.data),
    O.map((page) => feedTitles(page.events)),
    O.map((list) => A.take(list, 5)),
    O.getWithDefault([] as readonly string[]),
  );

  return (
    <div class="mt-6">
      <p class="text-sm font-medium text-accent">Feed</p>
      {titles.length === 0 ? (
        <p class="mt-2 text-slate-500">No upcoming events.</p>
      ) : (
        <ul class="mt-2 list-disc pl-5 text-slate-700">
          {titles.map((title) => (
            <li>{title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main class="min-h-screen bg-white text-slate-900">
        <section class="mx-auto flex max-w-xl flex-col items-start gap-2 px-6 py-16">
          <p class="flex items-center gap-2 text-sm font-medium text-accent">
            <HeartPulse class="size-5" />
            Gopur
          </p>
          <h1 class="text-3xl font-semibold tracking-tight">Stage 2 reads</h1>
          <p class="text-slate-600">
            Typed Hono RPC + TanStack Query against <code>/healthz</code> and <code>/feed</code>.
          </p>
          <Loading fallback={<p class="mt-4 text-slate-500">checking…</p>}>
            <HealthStatus />
            <FeedPreview />
          </Loading>
        </section>
      </main>
    </QueryClientProvider>
  );
}
