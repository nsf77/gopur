import type { Event } from "api";

export function EventCard(props: { event: Event; href?: string }) {
  const href = () => props.href ?? `/event/${encodeURIComponent(props.event.id)}`;
  return (
    <a href={href()} class="glass-card block rounded-2xl px-4 py-3 no-underline text-inherit">
      <p class="m-0 font-semibold">{props.event.title || "Untitled"}</p>
      <p class="m-0 mt-1 text-sm text-slate-600">
        {props.event.start_at} · {props.event.type}
      </p>
      <p class="m-0 mt-1 text-sm text-slate-500">{props.event.location}</p>
    </a>
  );
}
