import { QueryClient, useMutation, useQuery } from "@tanstack/solid-query";
import { A, O, pipe } from "@mobily/ts-belt";
import { createSignal } from "solid-js";
import HeartPulse from "~icons/lucide/heart-pulse";
import { fetchFeed, fetchHealth, feedTitles, likeEvent, saveEvent } from "../lib/api";
import { sessionToken } from "../lib/session";

export function HomePage(props: { queryClient: QueryClient }) {
  const health = useQuery(() => ({
    queryKey: ["healthz"],
    queryFn: () => fetchHealth(),
  }));
  const feed = useQuery(() => ({
    queryKey: ["feed"],
    queryFn: () => fetchFeed(),
  }));
  const ok = pipe(O.fromNullable(health.data), O.mapWithDefault(false, (d) => Boolean(d.ok)));
  const titles = pipe(
    O.fromNullable(feed.data),
    O.map((page) => feedTitles(page.events)),
    O.map((list) => A.take(list, 5)),
    O.getWithDefault([] as readonly string[]),
  );
  const event = pipe(
    O.fromNullable(feed.data),
    O.map((page) => page.events),
    O.flatMap(A.head),
    O.toNullable,
  );
  const [token, setToken] = createSignal(sessionToken());
  const like = useMutation(() => ({
    mutationFn: () => {
      if (!event) throw new Error("no event");
      return likeEvent(event.id, token());
    },
    onSuccess: () => props.queryClient.invalidateQueries({ queryKey: ["feed"] }),
  }));
  const save = useMutation(() => ({
    mutationFn: () => {
      if (!event) throw new Error("no event");
      return saveEvent(event.id, token());
    },
    onSuccess: () => props.queryClient.invalidateQueries({ queryKey: ["feed"] }),
  }));

  return (
    <section class="flex flex-col gap-2">
      <p class="flex items-center gap-2 text-sm font-medium text-accent">
        <HeartPulse class="size-5" />
        Gopur
      </p>
      <h1 class="text-3xl font-semibold tracking-tight">Events</h1>
      <p class="text-slate-600">Feed, my events, host editor, and notifications over Hono RPC.</p>
      <p class="mt-2 text-lg">API health: {ok ? "ok" : "down"}</p>
      <div class="mt-4">
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
      <div class="mt-6">
        <p class="text-sm font-medium text-accent">Like / save</p>
        <input
          class="mt-2 w-full rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm"
          placeholder="Bearer token"
          value={token()}
          onInput={(e) => setToken(e.currentTarget.value)}
        />
        <p class="mt-2 text-sm text-slate-600">{event ? `First event: ${event.title}` : "No event to write."}</p>
        <div class="mt-3 flex gap-2">
          <button
            class="rounded-full bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-50"
            disabled={!event || !token()}
            onClick={() => like.mutate()}
          >
            Like
          </button>
          <button
            class="rounded-full border border-accent px-3 py-1.5 text-sm text-accent disabled:opacity-50"
            disabled={!event || !token()}
            onClick={() => save.mutate()}
          >
            Save
          </button>
        </div>
      </div>
    </section>
  );
}
