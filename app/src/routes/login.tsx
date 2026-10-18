import { createFileRoute } from "@tanstack/react-router";
import { stringSearch } from "../lib/route-search";
import { LoginPage } from "../pages/LoginPage";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { next?: string } => ({
    next: stringSearch(search.next),
  }),
  component: function LoginRoute() {
    const { next } = Route.useSearch();
    return <LoginPage next={next} />;
  },
});
