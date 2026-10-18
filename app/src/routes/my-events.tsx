import { createFileRoute } from "@tanstack/react-router";
import { MyEventsPage } from "../pages/MyEventsPage";

export const Route = createFileRoute("/my-events")({
  component: MyEventsPage,
});
