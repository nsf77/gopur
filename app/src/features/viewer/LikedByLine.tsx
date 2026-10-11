import { likedByLabel, likedByProof } from "../../lib/liked-by";
import type { Event } from "../../lib/schemas";

export function LikedByLine(props: { event: Event }) {
  const proof = likedByProof(props.event);
  if (!proof) return null;
  return <p className="mb-1 text-xs text-text-muted">{likedByLabel(proof)}</p>;
}
