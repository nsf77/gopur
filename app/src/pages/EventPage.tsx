import { m } from "../paraglide/messages.js";

export function EventPage({ id }: { id: string }) {
  return (
    <main className="p-4">
      <h1 className="m-0 text-2xl font-extrabold tracking-tight">{m.event_title()}</h1>
      <p className="mt-2 text-sm text-text-muted">
        {m.event_stub()} <span className="font-mono">{id}</span>
      </p>
    </main>
  );
}
