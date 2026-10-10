import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/solid-query";
import { Loading } from "@solidjs/web";
import HeartPulse from "~icons/lucide/heart-pulse";
import { fetchHealth } from "./lib/api";

const queryClient = new QueryClient();

function HealthStatus() {
  const health = useQuery(() => ({
    queryKey: ["healthz"],
    queryFn: () => fetchHealth(),
  }));

  return (
    <p class="mt-4 text-lg">
      API health: {health.data.ok ? "ok" : "down"}
    </p>
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
          <h1 class="text-3xl font-semibold tracking-tight">Stage 1 smoke</h1>
          <p class="text-slate-600">
            Typed Hono RPC + TanStack Query against <code>/healthz</code>.
          </p>
          <Loading fallback={<p class="mt-4 text-slate-500">checking…</p>}>
            <HealthStatus />
          </Loading>
        </section>
      </main>
    </QueryClientProvider>
  );
}
