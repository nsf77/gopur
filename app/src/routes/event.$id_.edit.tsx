import { createFileRoute } from "@tanstack/react-router";
import { EditEventPage } from "../pages/EditEventPage";

export const Route = createFileRoute("/event/$id_/edit")({
  component: function EventEditRoute() {
    const { id } = Route.useParams();
    return <EditEventPage id={id} />;
  },
});
