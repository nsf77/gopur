import type { RouteSectionProps } from "@solidjs/router";
import { createRouter, defineRoutes } from "@solidjs/router";
import { QueryClientProvider } from "@tanstack/solid-query";
import { lazy } from "solid-js";
import { initSession, onSignOut } from "./lib/session";
import { queryClient } from "./query";
import { AppErrorBoundary } from "./shell/AppErrorBoundary";
import { AppShell } from "./shell/AppShell";

const FeedPage = lazy(() => import("./features/feed/FeedPage"));
const ExplorePage = lazy(() => import("./features/explore/ExplorePage"));
const EventDetailPage = lazy(() => import("./features/event/EventDetailPage"));
const EventLikersPage = lazy(() => import("./features/event/EventLikersPage"));
const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const LoginVerifyPage = lazy(() => import("./features/auth/LoginVerifyPage"));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage"));
const ProfileEditPage = lazy(() => import("./features/profile/ProfileEditPage"));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage"));
const UserProfilePage = lazy(() => import("./features/user/UserProfilePage"));
const OrganizerPage = lazy(() => import("./features/organizer/OrganizerPage"));
const MyEventsPage = lazy(() => import("./pages/MyEventsPage"));
const NewEventPage = lazy(() => import("./pages/NewEventPage"));
const EditEventPage = lazy(() => import("./pages/EditEventPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ChatListPage = lazy(() => import("./features/chat/ChatPages").then((m) => ({ default: m.ChatListPage })));
const ChatThreadPage = lazy(() => import("./features/chat/ChatPages").then((m) => ({ default: m.ThreadPage })));

const Router = createRouter({
  routes: defineRoutes([
    { path: "/", component: FeedPage },
    { path: "/explore", component: ExplorePage },
    { path: "/event/new", component: NewEventPage },
    { path: "/event/:id/edit", component: EditEventPage },
    { path: "/event/:id/likers", component: EventLikersPage },
    { path: "/event/:id", component: EventDetailPage },
    { path: "/login", component: LoginPage },
    { path: "/login/verify", component: LoginVerifyPage },
    { path: "/profile", component: ProfilePage },
    { path: "/profile/edit", component: ProfileEditPage },
    { path: "/settings", component: SettingsPage },
    { path: "/user/:id", component: UserProfilePage },
    { path: "/organizer/:key", component: OrganizerPage },
    { path: "/chat", component: ChatListPage },
    { path: "/chat/:id", component: ChatThreadPage },
    { path: "/my-events", component: MyEventsPage },
    { path: "/notifications", component: NotificationsPage },
  ]),
});

function AppLayout(props: { children: RouteSectionProps["children"] }) {
  return <AppShell>{props.children}</AppShell>;
}

initSession();
onSignOut(() => {
  queryClient.clear();
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <Router>{(layout: RouteSectionProps) => <AppLayout>{layout.children}</AppLayout>}</Router>
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}
