import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/event")({
  component: function EventLayout() {
    return <Outlet />;
  },
});
