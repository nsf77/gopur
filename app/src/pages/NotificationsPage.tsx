import { m } from "../paraglide/messages.js";
import { StubPage } from "./StubPage";

export function NotificationsPage() {
  return <StubPage title={m.notifications_title()} message={m.notifications_stub()} />;
}
