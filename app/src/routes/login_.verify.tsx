import { createFileRoute } from "@tanstack/react-router";
import { stringSearch } from "../lib/route-search";
import { LoginVerifyPage } from "../pages/LoginVerifyPage";

export const Route = createFileRoute("/login_/verify")({
  validateSearch: (search: Record<string, unknown>): { email?: string; next?: string } => ({
    email: stringSearch(search.email),
    next: stringSearch(search.next),
  }),
  component: function LoginVerifyRoute() {
    const { email, next } = Route.useSearch();
    return <LoginVerifyPage email={email} next={next} />;
  },
});
