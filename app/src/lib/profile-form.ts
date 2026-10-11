import * as v from "valibot";
import type { User } from "./schemas";

export type ProfileEditValues = {
  display_name: string;
  username: string;
  email: string;
  phone: string;
  avatar_url: string;
  bio: string;
  is_private: boolean;
};

export const ProfileEditSchema = v.object({
  display_name: v.pipe(v.string(), v.maxLength(50, "displayNameTooLong")),
  username: v.union([
    v.literal(""),
    v.pipe(v.string(), v.regex(/^[a-zA-Z][a-zA-Z0-9_]{2,29}$/, "invalidUsername")),
  ]),
  email: v.union([v.literal(""), v.pipe(v.string(), v.email("invalidEmail"))]),
  phone: v.pipe(
    v.string(),
    v.check((value) => {
      const trimmed = value.trim();
      if (!trimmed) return true;
      let digits = 0;
      for (const ch of trimmed) {
        if (ch >= "0" && ch <= "9") digits += 1;
        else if (ch === "+" || ch === "-" || ch === " " || ch === "(" || ch === ")") continue;
        else return false;
      }
      return digits >= 8 && digits <= 15;
    }, "invalidPhone"),
  ),
  avatar_url: v.pipe(
    v.string(),
    v.check((value) => {
      const trimmed = value.trim();
      if (!trimmed) return true;
      try {
        const url = new URL(trimmed);
        return Boolean(url.host) && (url.protocol === "http:" || url.protocol === "https:");
      } catch {
        return false;
      }
    }, "invalidAvatar"),
  ),
  bio: v.pipe(v.string(), v.maxLength(300, "bioTooLong")),
  is_private: v.boolean(),
});

export function formFromUser(user: User): ProfileEditValues {
  return {
    display_name: user.display_name ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    avatar_url: user.avatar_url ?? "",
    bio: user.bio ?? "",
    is_private: user.is_private,
  };
}

export function changedProfileFields(
  initial: ProfileEditValues,
  next: ProfileEditValues,
): Record<string, string | boolean> {
  const patch: Record<string, string | boolean> = {};
  (Object.keys(initial) as (keyof ProfileEditValues)[]).forEach((key) => {
    if (initial[key] !== next[key]) patch[key] = next[key];
  });
  return patch;
}
