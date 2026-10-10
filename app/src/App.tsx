import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { createRouter } from "@solidjs/router";
import type { Element } from "solid-js";
import { Loading, onSettled } from "solid-js";
import Bell from "~icons/lucide/bell";
import Calendar from "~icons/lucide/calendar";
import House from "~icons/lucide/house";
import Plus from "~icons/lucide/plus";
import { fetchMe } from "./lib/api";
import { clearSession, isSignedIn, sessionToken, sessionUser, setSession } from "./lib/session";
import { EditEventPage } from "./pages/EditEventPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { HomePage } from "./pages/HomePage";
import { MyEventsPage } from "./pages/MyEventsPage";
import { NewEventPage } from "./pages/NewEventPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SignInPage } from "./pages/SignInPage";

export const queryClient = new QueryClient();

function Shell(props: { children: Element }) {
  onSettled(() => {
    if (!sessionToken()) return;
    void fetchMe(sessionToken())
      .then((user) => setSession(sessionToken(), user))
      .catch(() => clearSession());
  });

  return (
    <div class="app-shell min-h-screen text-slate-900">
      <header class="glass sticky top-0 z-10 border-b border-white/30">
        <nav class="mx-auto flex max-w-xl items-center gap-1 px-3 py-2">
          <a href="/" class="nav-link" aria-label="Home">
            <House class="size-5" />
          </a>
          <a href="/my-events" class="nav-link">
            <Calendar class="size-5" />
            <span>My events</span>
          </a>
          <a href="/event/new" class="nav-link">
            <Plus class="size-5" />
            <span>Host</span>
          </a>
          <a href="/notifications" class="nav-link">
            <Bell class="size-5" />
            <span>Inbox</span>
          </a>
          <span class="ml-auto text-xs text-slate-500">
            {isSignedIn() ? (
              sessionUser()?.display_name || sessionUser()?.email || "signed in"
            ) : (
              <a href="/signin" class="font-semibold text-accent no-underline">
                Sign in
              </a>
            )}
          </span>
        </nav>
      </header>
      <main class="mx-auto max-w-xl px-4 py-6 pb-24">{props.children}</main>
    </div>
  );
}

const Router = createRouter({
  routes: [
    { path: "/", component: () => <HomePage queryClient={queryClient} /> },
    { path: "/my-events", component: MyEventsPage },
    { path: "/event/new", component: NewEventPage },
    { path: "/event/:id/edit", component: EditEventPage },
    { path: "/event/:id", component: EventDetailPage },
    { path: "/notifications", component: NotificationsPage },
    { path: "/signin", component: SignInPage },
  ],
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {(layout) => (
          <Shell>
            <Loading fallback={<p class="text-slate-500">loading…</p>}>{layout.children}</Loading>
          </Shell>
        )}
      </Router>
    </QueryClientProvider>
  );
}
