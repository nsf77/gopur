import { A, O, pipe } from "@gopur/shared";
import { m } from "../paraglide/messages.js";
import type { Event, EventLiker } from "@gopur/shared";

export type LikedByProof = {
  names: readonly string[];
  others: number;
};

function likerName(user: EventLiker): string {
  return user.display_name || user.username || "";
}

export function likedByProof(event: Event): LikedByProof | null {
  const names = pipe(
    event.liked_by,
    A.filterMap((u) => O.fromFalsy(likerName(u))),
  );
  if (names.length === 0) return null;
  return { names, others: Math.max(0, (event.like_count ?? names.length) - names.length) };
}

export function likedByLabel(proof: LikedByProof): string {
  const name = proof.names[0];
  const name2 = proof.names[1];
  if (!name) return "";
  if (proof.names.length >= 2 && name2) {
    if (proof.others > 0) {
      return m.viewer_likedByTwoOthers({ name1: name, name2, count: proof.others });
    }
    return m.viewer_likedByTwo({ name1: name, name2 });
  }
  if (proof.others > 0) {
    return m.viewer_likedByOneOthers({ name, count: proof.others });
  }
  return m.viewer_likedByOne({ name });
}
