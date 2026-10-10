import type { Event } from "api";
import { A, O, pipe } from "../../lib/belt";
import { t } from "../../lib/i18n";

export function LikedByLine(props: { event: Event }) {
  const names = () =>
    pipe(
      props.event.liked_by,
      A.filterMap((u) => O.fromFalsy(u.display_name ?? u.username)),
    );
  const first = () => names()[0];
  const second = () => names()[1];
  const extra = () => Math.max(0, (props.event.like_count ?? 0) - names().length);
  const text = () => {
    const a = first();
    if (!a) return "";
    const b = second();
    if (!b) return extra() > 0 ? t("viewer.liked") : t("viewer.liked");
    return t("viewer.liked");
  };
  return (
    <a href={`/event/${props.event.id}/likers`} class="text-xs text-text-muted no-underline">
      {text()}
    </a>
  );
}
