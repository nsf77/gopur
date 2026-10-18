import { createFileRoute } from "@tanstack/react-router";
import { ProfileEditPage } from "../pages/ProfileEditPage";

export const Route = createFileRoute("/profile_/edit")({
  component: ProfileEditPage,
});
