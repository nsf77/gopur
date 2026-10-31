import { decodeBase64Url, encodeBase64Url } from "./base64";

export const MAX_GROUP_MEMBERS = 256;
export const MAX_TEXT_RUNES = 4000;
export const MAX_EMOJI_RUNES = 32;
export const MAX_TITLE_RUNES = 80;
export const SEND_BURST = 30;

export const KIND_DM = "dm";
export const KIND_GROUP = "group";
export const FOLDER_INBOX = "inbox";
export const FOLDER_REQUESTS = "requests";
export const STATE_PENDING = "pending";
export const STATE_ACCEPTED = "accepted";
export const STATE_DECLINED = "declined";
export const ROLE_ADMIN = "admin";
export const ROLE_MEMBER = "member";
export const MSG_TEXT = "text";
export const MSG_EMOJI = "emoji";
export const MSG_PHOTO = "photo";
export const MSG_EVENT = "event";

export const ERR_TEEN_CONTACT = "teen contact restricted";
export const ERR_GROUP_FULL = "group is full";
export const ERR_EMPTY_BODY = "message body is required";
export const ERR_BODY_TOO_LONG = "message is too long";
export const ERR_INVALID_MESSAGE = "invalid message";
export const ERR_IMAGE_REQUIRED = "image url is required";
export const ERR_INVALID_IMAGE = "invalid image url";
export const ERR_EVENT_REQUIRED = "event_id is required";
export const ERR_INVALID_KIND = "invalid message kind";
export const ERR_INVALID_EMOJI = "invalid emoji";

export type Person = {
  id: string;
  age: number;
  ageKnown: boolean;
  isTeen: boolean;
  isPrivate: boolean;
};

export type Outbound = { kind: string; body: string; imageUrl: string; eventId: string };

export function canContact(actor: Person, target: Person, targetFollowsActor: boolean): string | null {
  if (target.isTeen && !actor.isTeen && !targetFollowsActor) return ERR_TEEN_CONTACT;
  return null;
}

export function dmPlacement(recipientFollowsSender: boolean): { folder: string; state: string } {
  if (recipientFollowsSender) return { folder: FOLDER_INBOX, state: STATE_ACCEPTED };
  return { folder: FOLDER_REQUESTS, state: STATE_PENDING };
}

export function showBio(targetPrivate: boolean, selfView: boolean, viewerFollowAccepted: boolean): boolean {
  if (selfView || !targetPrivate) return true;
  return viewerFollowAccepted;
}

export function roomFor(current: number, adding: number): string | null {
  if (adding < 0 || current < 0 || current + adding > MAX_GROUP_MEMBERS) return ERR_GROUP_FULL;
  return null;
}

function runeCount(s: string): number {
  return [...s].length;
}

export function normalizeTitle(raw: string): { ok: true; value: string } | { ok: false } {
  const title = raw.trim();
  if (!title || /[\r\n]/.test(title) || runeCount(title) > MAX_TITLE_RUNES) return { ok: false };
  return { ok: true, value: title };
}

export function normalizeEmoji(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const emoji = raw.trim();
  if (!emoji || /[\r\n]/.test(emoji) || runeCount(emoji) > MAX_EMOJI_RUNES) {
    return { ok: false, error: ERR_INVALID_EMOJI };
  }
  return { ok: true, value: emoji };
}

export function normalizeHttpUrl(raw: string): { ok: true; value: string } | { ok: false } {
  const cover = raw.trim();
  if (!cover) return { ok: true, value: "" };
  if (cover.length > 2000) return { ok: false };
  try {
    const u = new URL(cover);
    if (!u.host || (u.protocol !== "http:" && u.protocol !== "https:")) return { ok: false };
  } catch {
    return { ok: false };
  }
  return { ok: true, value: cover };
}

export function validateOutbound(
  kind: string,
  body: string,
  imageUrl: string,
  eventId: string,
): { ok: true; value: Outbound } | { ok: false; error: string } {
  kind = kind.trim();
  imageUrl = imageUrl.trim();
  eventId = eventId.trim();
  switch (kind) {
    case MSG_TEXT: {
      if (imageUrl || eventId) return { ok: false, error: ERR_INVALID_MESSAGE };
      if (!body.trim()) return { ok: false, error: ERR_EMPTY_BODY };
      if (runeCount(body) > MAX_TEXT_RUNES) return { ok: false, error: ERR_BODY_TOO_LONG };
      return { ok: true, value: { kind, body, imageUrl: "", eventId: "" } };
    }
    case MSG_EMOJI: {
      if (imageUrl || eventId) return { ok: false, error: ERR_INVALID_MESSAGE };
      const emoji = normalizeEmoji(body);
      if (!emoji.ok) return { ok: false, error: emoji.error };
      return { ok: true, value: { kind, body: emoji.value, imageUrl: "", eventId: "" } };
    }
    case MSG_PHOTO: {
      if (body.trim() || eventId) return { ok: false, error: ERR_INVALID_MESSAGE };
      if (!imageUrl) return { ok: false, error: ERR_IMAGE_REQUIRED };
      const n = normalizeHttpUrl(imageUrl);
      if (!n.ok || !n.value) return { ok: false, error: ERR_INVALID_IMAGE };
      return { ok: true, value: { kind, body: "", imageUrl: n.value, eventId: "" } };
    }
    case MSG_EVENT: {
      if (body.trim() || imageUrl) return { ok: false, error: ERR_INVALID_MESSAGE };
      if (!eventId) return { ok: false, error: ERR_EVENT_REQUIRED };
      return { ok: true, value: { kind, body: "", imageUrl: "", eventId } };
    }
    default:
      return { ok: false, error: ERR_INVALID_KIND };
  }
}

export function dmKey(a: string, b: string): string {
  return a > b ? `${b}|${a}` : `${a}|${b}`;
}

export function encodeChatCursor(ts: string, id: string): string {
  return encodeBase64Url(`${ts}\n${id}`);
}

export function decodeChatCursor(raw: string): { ok: true; ts: string; id: string } | { ok: false } {
  raw = raw.trim();
  if (!raw) return { ok: true, ts: "", id: "" };
  let text: string;
  try {
    text = decodeBase64Url(raw);
  } catch {
    return { ok: false };
  }
  const i = text.indexOf("\n");
  if (i < 0) return { ok: false };
  const ts = text.slice(0, i);
  const id = text.slice(i + 1);
  if (!ts || !id || ts.includes("\n")) return { ok: false };
  return { ok: true, ts, id };
}

let lastStamp = 0n;

export function nextStamp(nowMs = Date.now()): string {
  let ns = BigInt(nowMs) * 1_000_000n;
  if (ns <= lastStamp) ns = lastStamp + 1n;
  lastStamp = ns;
  const sec = Number(ns / 1_000_000_000n);
  const nano = Number(ns % 1_000_000_000n);
  const d = new Date(sec * 1000);
  const pad = (n: number, w: number) => String(n).padStart(w, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}T${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}:${pad(d.getUTCSeconds(), 2)}.${pad(nano, 9)}Z`;
}

export class Limiter {
  private hits = new Map<string, number[]>();
  constructor(
    private max = SEND_BURST,
    private windowMs = 60_000,
    private maxKeys = 4096,
  ) {
    if (this.max < 1) this.max = 1;
    if (this.windowMs <= 0) this.windowMs = 60_000;
    if (this.maxKeys < 1) this.maxKeys = 1;
  }

  allow(userId: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const prev = this.hits.get(userId) ?? [];
    const kept = prev.filter((t) => t > cutoff);
    if (kept.length >= this.max) {
      this.hits.set(userId, kept);
      return false;
    }
    kept.push(now);
    this.hits.set(userId, kept);
    while (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value as string | undefined;
      if (oldest === undefined || oldest === userId) break;
      this.hits.delete(oldest);
    }
    return true;
  }
}
