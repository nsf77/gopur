import { m } from "../paraglide/messages.js";
import { StubPage } from "./StubPage";

export function MyEventsPage() {
  return <StubPage title={m.myEvents_title()} message={m.myEvents_stub()} />;
}
