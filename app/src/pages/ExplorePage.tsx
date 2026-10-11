import { useState } from "react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { Search } from "lucide-react";
import { m } from "../paraglide/messages.js";
import { Tabs } from "../ui/Tabs";

const tabParser = parseAsStringLiteral(["events", "people"] as const).withDefault("events");

export function ExplorePage() {
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [tab, setTab] = useQueryState("tab", tabParser);
  const [draft, setDraft] = useState(q);

  return (
    <main className="pb-4">
      <form
        className="flex items-center gap-2 px-4 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          void setQ(draft || null);
        }}
      >
        <label className="glass-surface flex min-h-11 flex-1 items-center gap-2 rounded-pill px-3">
          <Search className="size-5 text-text-muted" />
          <input
            className="min-h-11 w-full bg-transparent outline-none"
            placeholder={m.explore_searchPlaceholder()}
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
        </label>
      </form>
      <Tabs
        aria-label={m.tabs_explore()}
        value={tab}
        onValueChange={(value) => void setTab(value === "people" ? "people" : "events")}
        items={[
          {
            value: "events",
            label: m.explore_tabEvents(),
            content: (
              <p className="px-4 text-sm text-text-muted">
                {m.explore_stub()} {q ? `"${q}"` : ""}
              </p>
            ),
          },
          {
            value: "people",
            label: m.explore_tabPeople(),
            content: <p className="px-4 text-sm text-text-muted">{m.explore_stub()}</p>,
          },
        ]}
      />
    </main>
  );
}
