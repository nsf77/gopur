import { m } from "../paraglide/messages.js";
import { StubPage } from "./StubPage";

export function ChatPage() {
  return <StubPage title={m.chat_title()} message={m.chat_stub()} />;
}
