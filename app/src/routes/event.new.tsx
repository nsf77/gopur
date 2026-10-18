import { createFileRoute } from "@tanstack/react-router";
import { NewEventPage } from "../pages/NewEventPage";

export const Route = createFileRoute("/event/new")({
  component: NewEventPage,
});
