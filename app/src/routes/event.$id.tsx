import { createFileRoute } from "@tanstack/react-router";
import { EventPage } from "../pages/EventPage";

export const Route = createFileRoute("/event/$id")({
  component: function EventRoute() {
    const { id } = Route.useParams();
    return <EventPage id={id} />;
  },
});
