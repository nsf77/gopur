import { BadgeCheck, CalendarClock, CalendarSync, UserCheck, Users } from "lucide-react";
import { formatEventWhen } from "../../lib/event-text";
import type { Notification } from "../../lib/schemas";
import { getLocale } from "../../paraglide/runtime.js";

function CategoryIcon(props: { category: string }) {
  const className = "mt-0.5 size-5 shrink-0 text-accent";
  if (props.category === "joins") return <UserCheck className={className} aria-hidden="true" />;
  if (props.category === "event_updates") return <CalendarSync className={className} aria-hidden="true" />;
  if (props.category === "social") return <Users className={className} aria-hidden="true" />;
  if (props.category === "verification") return <BadgeCheck className={className} aria-hidden="true" />;
  return <CalendarClock className={className} aria-hidden="true" />;
}

export function NotificationRow(props: { item: Notification; onSelect: () => void }) {
  const loc = getLocale();
  return (
    <button
      type="button"
      className={`mb-3 flex w-full gap-3 rounded-2xl border px-4 py-3 text-left ${
        props.item.read ? "border-divider bg-surface-elevated" : "border-accent/30 bg-accent/10"
      }`}
      onClick={props.onSelect}
      data-testid={`notification-row-${props.item.id}`}
    >
      <CategoryIcon category={props.item.category} />
      <div className="min-w-0 flex-1">
        <p className="m-0 font-semibold">{props.item.title}</p>
        <p className="m-0 mt-1 text-sm leading-5 text-text-muted">{props.item.body}</p>
        <p className="m-0 mt-2 text-xs text-text-muted">{formatEventWhen(props.item.created_at, loc)}</p>
      </div>
      {props.item.read ? null : <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
    </button>
  );
}
