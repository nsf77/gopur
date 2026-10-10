import { Show, createSignal } from "solid-js";
import type { Event } from "api";
import { formatCompactCount } from "../../lib/event-text";
import { locale, t } from "../../lib/i18n";
import { loginHref } from "../../lib/email";
import { isSignedIn } from "../../lib/session";
import { useRecordShare, useToggleLiked, useToggleSaved } from "../../lib/queries";
import IconBookmark from "~icons/lucide/bookmark";
import IconHeart from "~icons/lucide/heart";
import IconShare2 from "~icons/lucide/share-2";

const iconBtn =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-transparent text-text active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45";
const countBtn = "inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-xs tabular-nums text-text-muted no-underline";

export function EventActionRow(props: { event: Event; loginNext: string }) {
  const toggleLiked = useToggleLiked(() => props.event);
  const toggleSaved = useToggleSaved(() => props.event);
  const recordShare = useRecordShare(() => props.event);
  const [copyNotice, setCopyNotice] = createSignal("");
  const [pop, setPop] = createSignal(false);
  const loc = () => locale();
  const liked = () => props.event.liked_by_me === true;
  const saved = () => props.event.saved_by_me === true;

  const onLike = () => {
    if (!isSignedIn() || toggleLiked.isPending) return;
    const next = !liked();
    if (next) setPop(true);
    void toggleLiked.mutate(next);
  };

  const onSave = () => {
    if (!isSignedIn() || toggleSaved.isPending) return;
    void toggleSaved.mutate(!saved());
  };

  const onShare = async () => {
    const url = `${location.origin}/event/${props.event.id}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: props.event.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopyNotice(t("viewer.linkCopied"));
      }
      void recordShare.mutate(undefined);
    } catch {
      /* cancelled */
    }
  };

  return (
    <div class="flex min-h-11 w-full items-center gap-1">
      <Show
        when={isSignedIn()}
        fallback={
          <a class={iconBtn} aria-label={t("viewer.like")} href={loginHref(props.loginNext)}>
            <IconHeart class="size-5" />
          </a>
        }
      >
        <button
          type="button"
          class={iconBtn}
          aria-label={liked() ? t("viewer.liked") : t("viewer.like")}
          aria-pressed={liked() ? "true" : "false"}
          disabled={toggleLiked.isPending}
          onClick={onLike}
        >
          <IconHeart
            class={`size-5${liked() ? " fill-current text-red-500" : ""}${pop() ? " gopur-like-pop" : ""}`}
            onAnimationEnd={() => setPop(false)}
          />
        </button>
      </Show>
      <Show when={formatCompactCount(props.event.like_count ?? 0, loc())}>
        {(count) => (
          <a class={countBtn} href={`/event/${props.event.id}/likers`} aria-label={t("viewer.likers")}>
            {count()}
          </a>
        )}
      </Show>
      <button type="button" class={iconBtn} aria-label={t("viewer.share")} onClick={() => void onShare()}>
        <IconShare2 class="size-5" />
      </button>
      <Show
        when={isSignedIn()}
        fallback={
          <a class={iconBtn} aria-label={t("viewer.save")} href={loginHref(props.loginNext)}>
            <IconBookmark class="size-5" />
          </a>
        }
      >
        <button
          type="button"
          class={iconBtn}
          aria-label={saved() ? t("viewer.saved") : t("viewer.save")}
          aria-pressed={saved() ? "true" : "false"}
          disabled={toggleSaved.isPending}
          onClick={onSave}
        >
          <IconBookmark class={`size-5${saved() ? " fill-current text-accent" : ""}`} />
        </button>
      </Show>
      <Show when={copyNotice()}>
        <p class="m-0 text-sm text-text-muted" role="status">
          {copyNotice()}
        </p>
      </Show>
    </div>
  );
}
