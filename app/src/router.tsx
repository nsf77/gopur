import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { queryClient } from "./lib/query";
import { AppShell } from "./shell/AppShell";
import { ChatPage } from "./pages/ChatPage";
import { EventPage } from "./pages/EventPage";
import { ExplorePage } from "./pages/ExplorePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { LoginVerifyPage } from "./pages/LoginVerifyPage";
import { MyEventsPage } from "./pages/MyEventsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";

const rootRoute = createRootRoute({
  component: function RootLayout() {
    return (
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <AppShell>
            <Outlet />
          </AppShell>
        </NuqsAdapter>
      </QueryClientProvider>
    );
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore",
  component: ExplorePage,
});

const eventRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/event/$id",
  component: function EventRoute() {
    const { id } = eventRoute.useParams();
    return <EventPage id={id} />;
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>): { next?: string } => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  component: function LoginRoute() {
    const { next } = loginRoute.useSearch();
    return <LoginPage next={next} />;
  },
});

const loginVerifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login/verify",
  validateSearch: (search: Record<string, unknown>): { email: string; next?: string } => ({
    email: typeof search.email === "string" ? search.email : "",
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  component: function LoginVerifyRoute() {
    const { email, next } = loginVerifyRoute.useSearch();
    return <LoginVerifyPage email={email} next={next} />;
  },
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: ChatPage,
});

const myEventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-events",
  component: MyEventsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: NotificationsPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  exploreRoute,
  eventRoute,
  loginRoute,
  loginVerifyRoute,
  chatRoute,
  myEventsRoute,
  settingsRoute,
  notificationsRoute,
  profileRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
