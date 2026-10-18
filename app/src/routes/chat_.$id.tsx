import { createFileRoute } from "@tanstack/react-router";
import { ChatThreadPage } from "../pages/ChatThreadPage";

export const Route = createFileRoute("/chat_/$id")({
  component: function ChatThreadRoute() {
    const { id } = Route.useParams();
    return <ChatThreadPage id={id} />;
  },
});
