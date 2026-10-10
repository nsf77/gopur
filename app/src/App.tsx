import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/solid-query";
import { Loading } from "@solidjs/web";
import { createSignal } from "solid-js";
import HeartPulse from "~icons/lucide/heart-pulse";
import { A, O, pipe } from "@mobily/ts-belt";
import { fetchFeed, fetchHealth, feedTitles, likeEvent, saveEvent } from "./lib/api";

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

function WritePreview() {
  const [token, setToken] = createSignal("");
  const feed = useQuery(() => ({
    queryKey: ["feed"],
    queryFn: () => fetchFeed(),
  }));
  const event = pipe(
    O.fromNullable(feed.data),
    O.map((page) => page.events),
    O.flatMap(A.head),
    O.toNullable,
  );

  const like = useMutation(() => ({
    mutationFn: () => {
      const ev = event;
      if (!ev) throw new Error("no event");
      return likeEvent(ev.id, token());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  }));
  const save = useMutation(() => ({
    mutationFn: () => {
      const ev = event;
      if (!ev) throw new Error("no event");
      return saveEvent(ev.id, token());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  }));

  return (
    <div class="mt-8 w-full">
      <p class="text-sm font-medium text-accent">Like / save</p>
      <input
        class="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        placeholder="Bearer token from /auth/email/verify"
        value={token()}
        onInput={(e) => setToken(e.currentTarget.value)}
      />
      <p class="mt-2 text-sm text-slate-600">
        {event ? `First event: ${event.title}` : "No event to write."}
      </p>
      <div class="mt-3 flex gap-2">
        <button
          class="rounded bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-50"
          disabled={!event || !token()}
          onClick={() => like.mutate()}
        >
          Like
        </button>
        <button
          class="rounded border border-accent px-3 py-1.5 text-sm text-accent disabled:opacity-50"
          disabled={!event || !token()}
          onClick={() => save.mutate()}
        >
          Save
        </button>
      </div>
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
          <h1 class="text-3xl font-semibold tracking-tight">Stage 3 writes</h1>
          <p class="text-slate-600">
            Typed Hono RPC + TanStack Query for reads, like, and save.
          </p>
          <Loading fallback={<p class="mt-4 text-slate-500">checking…</p>}>
            <HealthStatus />
            <FeedPreview />
            <WritePreview />
          </Loading>
        </section>
      </main>
    </QueryClientProvider>
  );
}
