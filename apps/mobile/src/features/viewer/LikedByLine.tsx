import { Text } from "react-native";
import type { Event } from "@gopur/shared";
import { likedByLabel, likedByProof } from "../../lib/liked-by";

export function LikedByLine(props: { event: Event }) {
  const proof = likedByProof(props.event);
  if (!proof) return null;
  return <Text className="mb-1 text-xs text-text-muted">{likedByLabel(proof)}</Text>;
}
