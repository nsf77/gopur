import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { queryClient } from "./lib/query";
import { AppShell } from "./shell/AppShell";
import { ChatPage } from "./pages/ChatPage";
import { ChatThreadPage } from "./pages/ChatThreadPage";
import { EditEventPage } from "./pages/EditEventPage";
import { EventPage } from "./pages/EventPage";
import { ExplorePage } from "./pages/ExplorePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { LoginVerifyPage } from "./pages/LoginVerifyPage";
import { MyEventsPage } from "./pages/MyEventsPage";
import { NewEventPage } from "./pages/NewEventPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfileEditPage } from "./pages/ProfileEditPage";
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

const eventNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/event/new",
  component: NewEventPage,
});

const eventRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/event/$id",
  component: function EventRoute() {
    const { id } = eventRoute.useParams();
    return <EventPage id={id} />;
  },
});

const eventEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/event/$id/edit",
  component: function EventEditRoute() {
    const { id } = eventEditRoute.useParams();
    return <EditEventPage id={id} />;
  },
});

function stringSearch(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>): { next?: string } => ({
    next: stringSearch(search.next),
  }),
  component: function LoginRoute() {
    const { next } = loginRoute.useSearch();
    return <LoginPage next={next} />;
  },
});

const loginVerifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login/verify",
  validateSearch: (search: Record<string, unknown>): { email?: string; next?: string } => ({
    email: stringSearch(search.email),
    next: stringSearch(search.next),
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

const chatThreadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat/$id",
  component: function ChatThreadRoute() {
    const { id } = chatThreadRoute.useParams();
    return <ChatThreadPage id={id} />;
  },
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

const profileEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/edit",
  component: ProfileEditPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  exploreRoute,
  eventNewRoute,
  eventRoute,
  eventEditRoute,
  loginRoute,
  loginVerifyRoute,
  chatRoute,
  chatThreadRoute,
  myEventsRoute,
  settingsRoute,
  notificationsRoute,
  profileRoute,
  profileEditRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
