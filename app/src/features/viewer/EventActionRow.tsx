import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, Heart, Share2 } from "lucide-react";
import { formatCompactCount } from "../../lib/event-text";
import { useRecordShare, useToggleLiked, useToggleSaved } from "../../lib/queries";
import type { Event } from "../../lib/schemas";
import { getLocale } from "../../paraglide/runtime.js";
import { m } from "../../paraglide/messages.js";
import { useSessionStore } from "../../stores/session";

const iconBtn =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-transparent text-text active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45";
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
        <button
          type="button"
          className={iconBtn}
          aria-label={liked ? m.viewer_liked() : m.viewer_like()}
          aria-pressed={liked ? "true" : "false"}
          disabled={toggleLiked.isPending}
          onClick={onLike}
        >
          <Heart
            className={`size-5${liked ? " fill-current text-red-500" : ""}${pop ? " gopur-like-pop" : ""}`}
            onAnimationEnd={() => setPop(false)}
          />
        </button>
      ) : (
        <Link className={iconBtn} aria-label={m.viewer_like()} to="/login" search={{ next: props.loginNext }}>
          <Heart className="size-5" />
        </Link>
      )}
      {likeCount ? <span className={countClass}>{likeCount}</span> : null}
      <button type="button" className={iconBtn} aria-label={m.viewer_share()} onClick={() => void onShare()}>
        <Share2 className="size-5" />
      </button>
      {signedIn ? (
        <button
          type="button"
          className={iconBtn}
          aria-label={saved ? m.viewer_saved() : m.viewer_save()}
          aria-pressed={saved ? "true" : "false"}
          disabled={toggleSaved.isPending}
          onClick={onSave}
        >
          <Bookmark className={`size-5${saved ? " fill-current text-accent" : ""}`} />
        </button>
      ) : (
        <Link className={iconBtn} aria-label={m.viewer_save()} to="/login" search={{ next: props.loginNext }}>
          <Bookmark className="size-5" />
        </Link>
      )}
      {copyNotice ? (
        <p className="m-0 text-sm text-text-muted" role="status">
          {copyNotice}
        </p>
      ) : null}
    </div>
  );
}
