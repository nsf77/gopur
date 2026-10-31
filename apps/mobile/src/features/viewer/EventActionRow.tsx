import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BookmarkSimpleIcon, HeartIcon, ShareNetworkIcon } from "phosphor-react-native";
import { formatCompactCount } from "@gopur/shared";
import { useRecordShare, useToggleLiked, useToggleSaved } from "../../lib/queries";
import type { Event } from "@gopur/shared";
import { getLocale } from "../../paraglide/runtime.js";
import { m } from "../../paraglide/messages.js";
import { isSignedIn } from "../../stores/session";
import { apiBase } from "../../lib/api";

export function EventActionRow(props: { event: Event; loginNext: string }) {
  const router = useRouter();
  const signedIn = isSignedIn();
  const toggleLiked = useToggleLiked(props.event);
  const toggleSaved = useToggleSaved(props.event);
  const recordShare = useRecordShare(props.event);
  const [copyNotice, setCopyNotice] = useState("");
  const loc = getLocale();
  const liked = props.event.liked_by_me === true;
  const saved = props.event.saved_by_me === true;
  const likeCount = formatCompactCount(props.event.like_count ?? 0, loc);
  const origin = apiBase().replace(/\/api$/, "");

  const needLogin = () => router.push(`/login?next=${encodeURIComponent(props.loginNext)}`);

  return (
    <View className="min-h-11 w-full flex-row items-center gap-1">
      <Pressable
        accessibilityLabel={liked ? m.viewer_liked() : m.viewer_like()}
        onPress={() => {
          if (!signedIn) return needLogin();
          if (!toggleLiked.isPending) toggleLiked.mutate(!liked);
        }}
        className="size-11 items-center justify-center"
      >
        <HeartIcon size={20} color={liked ? "#c0392b" : "#737373"} weight={liked ? "fill" : "regular"} />
      </Pressable>
      {likeCount ? <Text className="px-1 text-xs text-text-muted">{likeCount}</Text> : null}
      <Pressable
        accessibilityLabel={m.viewer_share()}
        onPress={() => {
          const url = `${origin}/event/${props.event.id}`;
          void Share.share({ message: url, url }).then(() => recordShare.mutate());
          setCopyNotice(m.viewer_linkCopied());
        }}
        className="size-11 items-center justify-center"
      >
        <ShareNetworkIcon size={20} color="#737373" />
      </Pressable>
      <Pressable
        accessibilityLabel={saved ? m.viewer_saved() : m.viewer_save()}
        onPress={() => {
          if (!signedIn) return needLogin();
          if (!toggleSaved.isPending) toggleSaved.mutate(!saved);
        }}
        className="size-11 items-center justify-center"
      >
        <BookmarkSimpleIcon size={20} color={saved ? "#304385" : "#737373"} weight={saved ? "fill" : "regular"} />
      </Pressable>
      {copyNotice ? <Text className="text-sm text-text-muted">{copyNotice}</Text> : null}
    </View>
  );
}
