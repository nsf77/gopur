import { useState } from "react";
import { BookmarkSimpleIcon, HeartIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { Button, LinkButton } from "@cloudflare/kumo/components/button";
import { formatCompactCount } from "../../lib/event-text";
import { useRecordShare, useToggleLiked, useToggleSaved } from "../../lib/queries";
import type { Event } from "../../lib/schemas";
import { getLocale } from "../../paraglide/runtime.js";
import { m } from "../../paraglide/messages.js";
import { useSessionStore } from "../../stores/session";

const countClass = "inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-xs tabular-nums text-text-muted";

export function EventActionRow(props: { event: Event; loginNext: string }) {
  const signedIn = useSessionStore((s) => Boolean(s.token));
  const toggleLiked = useToggleLiked(props.event);
  const toggleSaved = useToggleSaved(props.event);
  const recordShare = useRecordShare(props.event);
  const [copyNotice, setCopyNotice] = useState("");
  const [pop, setPop] = useState(false);
  const loc = getLocale();
  const liked = props.event.liked_by_me === true;
  const saved = props.event.saved_by_me === true;
  const likeCount = formatCompactCount(props.event.like_count ?? 0, loc);

  const onLike = () => {
    if (!signedIn || toggleLiked.isPending) return;
    const next = !liked;
    if (next) setPop(true);
    toggleLiked.mutate(next);
  };

  const onSave = () => {
    if (!signedIn || toggleSaved.isPending) return;
    toggleSaved.mutate(!saved);
  };

  const onShare = async () => {
    const url = `${location.origin}/event/${props.event.id}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: props.event.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopyNotice(m.viewer_linkCopied());
      }
      recordShare.mutate();
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="flex min-h-11 w-full items-center gap-1">
      {signedIn ? (
        <Button
          type="button"
          variant="ghost"
          shape="circle"
          aria-label={liked ? m.viewer_liked() : m.viewer_like()}
          aria-pressed={liked ? "true" : "false"}
          disabled={toggleLiked.isPending}
          onClick={onLike}
          icon={
            <HeartIcon
              weight={liked ? "fill" : "regular"}
              className={`size-5${liked ? " text-kumo-danger" : ""}${pop ? " gopur-like-pop" : ""}`}
              onAnimationEnd={() => setPop(false)}
            />
          }
        />
      ) : (
        <LinkButton
          href={`/login?next=${encodeURIComponent(props.loginNext)}`}
          variant="ghost"
          shape="circle"
          aria-label={m.viewer_like()}
          icon={<HeartIcon className="size-5" />}
        />
      )}
      {likeCount ? <span className={countClass}>{likeCount}</span> : null}
      <Button
        type="button"
        variant="ghost"
        shape="circle"
        aria-label={m.viewer_share()}
        onClick={() => void onShare()}
        icon={<ShareNetworkIcon className="size-5" />}
      />
      {signedIn ? (
        <Button
          type="button"
          variant="ghost"
          shape="circle"
          aria-label={saved ? m.viewer_saved() : m.viewer_save()}
          aria-pressed={saved ? "true" : "false"}
          disabled={toggleSaved.isPending}
          onClick={onSave}
          icon={
            <BookmarkSimpleIcon
              weight={saved ? "fill" : "regular"}
              className={`size-5${saved ? " text-accent" : ""}`}
            />
          }
        />
      ) : (
        <LinkButton
          href={`/login?next=${encodeURIComponent(props.loginNext)}`}
          variant="ghost"
          shape="circle"
          aria-label={m.viewer_save()}
          icon={<BookmarkSimpleIcon className="size-5" />}
        />
      )}
      {copyNotice ? (
        <p className="m-0 text-sm text-text-muted" role="status">
          {copyNotice}
        </p>
      ) : null}
    </div>
  );
}
