import { arktypeValidator } from "@hono/arktype-validator";
import type { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { replyAuth, requireAuth, takeAuth } from "./auth";
import {
  KIND_DM,
  KIND_GROUP,
  FOLDER_INBOX,
  FOLDER_REQUESTS,
  MSG_EVENT,
  STATE_ACCEPTED,
  STATE_DECLINED,
  STATE_PENDING,
  Limiter,
  canContact,
  decodeChatCursor,
  dmKey,
  dmPlacement,
  encodeChatCursor,
  nextStamp,
  normalizeHttpUrl,
  normalizeTitle,
  roomFor,
  showBio,
  validateOutbound,
  type Person,
} from "./chat-rules";
import { ackEnvelopes, fanoutRelay, parseDeviceId, pendingEnvelopes, pushToHub, readMessages, upsertDevice } from "./chat-relay";
import { all, one, placeholders, run } from "./db";
import {
  audienceFromUser,
  blockedEitherWay,
  getUser,
  str,
  type EventRow,
  type UserRow,
} from "./event";
import { isTeen, parseBirthdate } from "./age";
import { ageVisible } from "./feed";
import { resolve, unmarshal } from "./i18n";
import {
  ConvFolderQuery,
  ConvIdParam,
  CreateConversation,
  DeviceBody,
  DeviceQuery,
  EnvelopeAck,
  MessagesQuery,
  SendMessageBody,
  invalidBody,
  invalidParam,
  invalidQuery,
} from "./schemas";
import type { Bindings } from "./types";

const limiter = new Limiter();

class HTTPError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Access = { conv: Record<string, unknown>; member: Record<string, unknown> };
type MemberRow = Record<string, unknown>;

const err = (
  c: { json: (body: { error: string }, status: 400 | 403 | 404 | 409 | 429) => Response },
  status: 400 | 403 | 404 | 409 | 429,
  message: string,
) => c.json({ error: message }, status);

function n01(v: unknown): boolean {
  return Number(v) !== 0 && v != null && v !== "";
}

function uniqueIDs(ids: unknown, self: string): string[] {
  const arr = Array.isArray(ids) ? ids : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const id = String(raw ?? "").trim();
    if (!id || id === self || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function personFromUser(user: UserRow): Person {
  const p: Person = {
    id: str(user.id),
    age: 0,
    ageKnown: false,
    isTeen: false,
    isPrivate: n01(user.is_private),
  };
  const bd = str(user.birthdate);
  if (bd) {
    try {
      p.age = parseBirthdate(bd);
      p.ageKnown = true;
      p.isTeen = isTeen(p.age);
    } catch {
      /* ignore */
    }
  }
  return p;
}

async function followsAccepted(db: D1Database, followerId: string, followeeId: string): Promise<boolean> {
  if (!followerId || !followeeId || followerId === followeeId) return false;
  const row = await one<{ status: string }>(
    db,
    "SELECT status FROM follows WHERE follower_id = ? AND followee_id = ? LIMIT 1",
    [followerId, followeeId],
  );
  return row?.status === "accepted";
}

async function loadAccess(db: D1Database, userId: string, convId: string): Promise<Access> {
  const member = await one<Record<string, unknown>>(
    db,
    "SELECT * FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
    [convId, userId],
  );
  if (!member || member.left_at || str(member.request_state) === STATE_DECLINED) {
    throw new HTTPError(404, "conversation not found");
  }
  const conv = await one<Record<string, unknown>>(db, "SELECT * FROM conversations WHERE id = ?", [convId]);
  if (!conv) throw new HTTPError(404, "conversation not found");
  if (str(conv.kind) === KIND_DM) {
    const blocked = await one<{ n: number }>(
      db,
      `SELECT COUNT(*) AS n FROM conversation_members other
       INNER JOIN blocks b ON (
         (b.blocker_id = ? AND b.blocked_id = other.user_id)
         OR (b.blocker_id = other.user_id AND b.blocked_id = ?)
       )
       WHERE other.conversation_id = ? AND other.user_id != ?`,
      [userId, userId, convId, userId],
    );
    if (Number(blocked?.n ?? 0) > 0) throw new HTTPError(404, "conversation not found");
  }
  return { conv, member };
}

function localeOf(lang: string): string {
  return lang.toLowerCase().startsWith("en") ? "en" : "zh-Hant";
}

async function listActiveMembers(db: D1Database, convIds: string[]): Promise<MemberRow[]> {
  if (!convIds.length) return [];
  return all<MemberRow>(
    db,
    `SELECT cm.conversation_id, cm.user_id, cm.role, cm.folder, cm.request_state, cm.muted,
            cm.last_read_at, cm.last_read_message_id, cm.joined_at,
            u.username, u.display_name, u.avatar_url, u.bio, u.is_private, u.is_verified
     FROM conversation_members cm JOIN users u ON u.id = cm.user_id
     WHERE cm.conversation_id IN (${placeholders(convIds.length)}) AND cm.left_at IS NULL
     ORDER BY cm.conversation_id ASC, cm.joined_at ASC, cm.user_id ASC`,
    convIds,
  );
}

async function memberView(db: D1Database, viewerId: string, row: MemberRow): Promise<Record<string, unknown>> {
  const self = str(row.user_id) === viewerId;
  const priv = n01(row.is_private);
  const follows = priv && !self ? await followsAccepted(db, viewerId, str(row.user_id)) : false;
  const out: Record<string, unknown> = { id: row.user_id };
  if (str(row.username)) out.username = row.username;
  if (str(row.display_name)) out.display_name = row.display_name;
  if (str(row.avatar_url)) out.avatar_url = row.avatar_url;
  if (showBio(priv, self, follows) && str(row.bio)) out.bio = row.bio;
  out.is_private = priv;
  out.is_verified = n01(row.is_verified);
  out.role = row.role;
  out.request_state = row.request_state;
  if (str(row.last_read_message_id)) out.last_read_message_id = row.last_read_message_id;
  if (str(row.last_read_at)) out.last_read_at = row.last_read_at;
  return out;
}

function eventCardVisible(viewer: UserRow, row: EventRow, blocked: boolean): boolean {
  if (n01(row.hidden)) return false;
  const host = str(row.host_user_id);
  if (host && host !== str(viewer.id) && blocked) return false;
  if (host && host === str(viewer.id)) return true;
  return ageVisible(
    row.age_min == null ? null : Number(row.age_min),
    row.age_max == null ? null : Number(row.age_max),
    str(row.age_mode) || "suggested",
    audienceFromUser(viewer),
  );
}

function oneMessage(
  viewer: UserRow,
  msg: Record<string, unknown>,
  eventsById: Map<string, EventRow>,
  blockedHosts: Set<string>,
): Record<string, unknown> {
  if (msg.unsent_at) {
    return {
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      kind: msg.kind,
      reactions: [],
      created_at: msg.created_at,
      unsent_at: msg.unsent_at,
    };
  }
  const item: Record<string, unknown> = {
    id: msg.id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    kind: msg.kind,
  };
  if (str(msg.body)) item.body = msg.body;
  if (str(msg.image_url)) item.image_url = msg.image_url;
  if (str(msg.kind) === MSG_EVENT) {
    if (!str(msg.event_id)) {
      item.event_hidden = true;
    } else {
      const row = eventsById.get(str(msg.event_id));
      if (!row || !eventCardVisible(viewer, row, blockedHosts.has(str(row.host_user_id)))) {
        item.event_hidden = true;
      } else {
        const titles = unmarshal(str(row.title_i18n)) ?? {};
        const card: Record<string, unknown> = {
          id: row.id,
          title: resolve(titles, localeOf(str(viewer.language))),
          start_at: row.start_at,
        };
        if (str(row.cover_image_url)) card.cover_image_url = row.cover_image_url;
        card.cancelled = n01(row.cancelled);
        if (str(row.host_user_id)) card.host_user_id = row.host_user_id;
        item.event_id = row.id;
        item.event = card;
      }
    }
  }
  if (str(msg.reply_to_id)) item.reply_to = msg.reply_to_id;
  item.reactions = [];
  item.created_at = msg.created_at;
  return item;
}

export async function presentMessages(
  db: D1Database,
  viewer: UserRow,
  msgs: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (!msgs.length) return [];
  const eventIDs: string[] = [];
  const seen = new Set<string>();
  for (const msg of msgs) {
    if (str(msg.kind) === MSG_EVENT && str(msg.event_id) && !msg.unsent_at && !seen.has(str(msg.event_id))) {
      seen.add(str(msg.event_id));
      eventIDs.push(str(msg.event_id));
    }
  }
  const eventsById = new Map<string, EventRow>();
  if (eventIDs.length) {
    const rows = await all<EventRow>(
      db,
      `SELECT id, title_i18n, start_at, cover_image_url, cancelled, host_user_id, hidden, age_min, age_max, age_mode
       FROM events WHERE id IN (${placeholders(eventIDs.length)})`,
      eventIDs,
    );
    for (const row of rows) eventsById.set(str(row.id), row);
  }
  const blockedHosts = new Set<string>();
  for (const row of eventsById.values()) {
    const host = str(row.host_user_id);
    if (host && host !== str(viewer.id) && (await blockedEitherWay(db, str(viewer.id), host))) blockedHosts.add(host);
  }
  return msgs.map((m) => oneMessage(viewer, m, eventsById, blockedHosts));
}

async function unreadCount(db: D1Database, convId: string, viewerId: string, lastReadAt: string, lastReadId: string): Promise<number> {
  const row = await one<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM messages m
     WHERE m.conversation_id = ? AND m.sender_id != ? AND m.unsent_at IS NULL
       AND (? = '' OR m.created_at > ? OR (m.created_at = ? AND ? != '' AND m.id > ?))
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = ? AND b.blocked_id = m.sender_id)
          OR (b.blocker_id = m.sender_id AND b.blocked_id = ?))
       AND m.removed_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM users banned_sender WHERE banned_sender.id = m.sender_id AND banned_sender.banned_at IS NOT NULL)`,
    [convId, viewerId, lastReadAt, lastReadAt, lastReadAt, lastReadId, lastReadId, viewerId, viewerId],
  );
  return Number(row?.n ?? 0);
}

async function assemble(db: D1Database, viewer: UserRow, heads: Access[]): Promise<Record<string, unknown>[]> {
  if (!heads.length) return [];
  const ids = heads.map((h) => str(h.conv.id));
  const members = await listActiveMembers(db, ids);
  const byConv = new Map<string, MemberRow[]>();
  for (const row of members) {
    const list = byConv.get(str(row.conversation_id)) ?? [];
    list.push(row);
    byConv.set(str(row.conversation_id), list);
  }
  const lastMsgs: Array<Record<string, unknown> | null> = [];
  for (const h of heads) {
    lastMsgs.push(
      await one<Record<string, unknown>>(
        db,
        `SELECT m.* FROM messages m WHERE m.conversation_id = ?
           AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = ? AND b.blocked_id = m.sender_id)
              OR (b.blocker_id = m.sender_id AND b.blocked_id = ?))
           AND m.removed_at IS NULL
           AND NOT EXISTS (SELECT 1 FROM users banned_sender WHERE banned_sender.id = m.sender_id AND banned_sender.banned_at IS NOT NULL)
         ORDER BY m.created_at DESC, m.id DESC LIMIT 1`,
        [str(h.conv.id), str(viewer.id), str(viewer.id)],
      ),
    );
  }
  const flat = lastMsgs.filter((m): m is Record<string, unknown> => !!m);
  const presented = await presentMessages(db, viewer, flat);
  let pi = 0;
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    if (!h) continue;
    const memberRows = byConv.get(str(h.conv.id)) ?? [];
    let peerState = "";
    const mems = [];
    for (const row of memberRows) {
      if (str(h.conv.kind) === KIND_DM && str(row.user_id) !== str(viewer.id)) peerState = str(row.request_state);
      mems.push(await memberView(db, str(viewer.id), row));
    }
    const lastAt = str(h.member.last_read_at);
    const lastId = str(h.member.last_read_message_id);
    const item: Record<string, unknown> = { id: h.conv.id, kind: h.conv.kind };
    if (str(h.conv.title)) item.title = h.conv.title;
    if (str(h.conv.photo_url)) item.photo_url = h.conv.photo_url;
    item.folder = h.member.folder;
    item.muted = n01(h.member.muted);
    item.role = h.member.role;
    item.request_state = h.member.request_state;
    if (peerState) item.peer_request_state = peerState;
    item.unread_count = await unreadCount(db, str(h.conv.id), str(viewer.id), lastAt, lastId);
    if (lastId) item.last_read_message_id = lastId;
    item.last_message = lastMsgs[i] ? presented[pi++] : null;
    item.members = mems;
    item.created_at = h.conv.created_at;
    item.updated_at = h.conv.updated_at;
    out.push(item);
  }
  return out;
}

async function writeConv(db: D1Database, viewer: UserRow, convId: string): Promise<Record<string, unknown>> {
  const access = await loadAccess(db, str(viewer.id), convId);
  const [item] = await assemble(db, viewer, [access]);
  return item ?? { id: convId };
}

function queryLimit(raw: string | undefined, fallback: number, max: number): number {
  let limit = fallback;
  if (raw) {
    const num = Number(raw);
    if (Number.isInteger(num) && num > 0) limit = num;
  }
  if (limit > max) limit = max;
  return limit;
}

async function screenInvitees(db: D1Database, actor: UserRow, inviteeIDs: string[], extraMemberIDs: string[]): Promise<void> {
  if (!inviteeIDs.length) return;
  const users = await all<UserRow>(db, `SELECT * FROM users WHERE id IN (${placeholders(inviteeIDs.length)})`, inviteeIDs);
  const byID = new Map(users.map((u) => [str(u.id), u]));
  const allIds = [str(actor.id), ...extraMemberIDs, ...inviteeIDs];
  const blocks = allIds.length
    ? await all<{ blocker_id: string; blocked_id: string }>(
        db,
        `SELECT blocker_id, blocked_id FROM blocks WHERE blocker_id IN (${placeholders(allIds.length)}) AND blocked_id IN (${placeholders(allIds.length)})`,
        [...allIds, ...allIds],
      )
    : [];
  const blocked = new Set(blocks.map((b) => `${b.blocker_id}|${b.blocked_id}`));
  const either = (a: string, b: string) => blocked.has(`${a}|${b}`) || blocked.has(`${b}|${a}`);
  const others = [...extraMemberIDs];
  for (const id of inviteeIDs) {
    const user = byID.get(id);
    if (!user) throw new HTTPError(404, "user not found");
    if (either(str(actor.id), id)) throw new HTTPError(404, "user not found");
    const follows = await followsAccepted(db, id, str(actor.id));
    if (canContact(personFromUser(actor), personFromUser(user), follows)) {
      throw new HTTPError(403, "adults cannot add a teen who does not follow them");
    }
    for (const other of others) {
      if (either(other, id)) throw new HTTPError(403, "cannot add this user");
    }
    others.push(id);
  }
}

async function eventVisible(db: D1Database, viewer: UserRow, event: EventRow): Promise<boolean> {
  if (n01(event.hidden)) return false;
  const host = str(event.host_user_id);
  if (host && host === str(viewer.id)) return true;
  if (host && (await blockedEitherWay(db, str(viewer.id), host))) return false;
  return ageVisible(
    event.age_min == null ? null : Number(event.age_min),
    event.age_max == null ? null : Number(event.age_max),
    str(event.age_mode) || "suggested",
    audienceFromUser(viewer),
  );
}

function catchHttp(e: unknown, fallback: string): { status: 400 | 403 | 404 | 409; message: string } {
  if (e instanceof HTTPError && (e.status === 400 || e.status === 403 || e.status === 404 || e.status === 409)) {
    return { status: e.status, message: e.message };
  }
  return { status: 400, message: fallback };
}

export const chat = new Hono<{ Bindings: Bindings }>()
  .post("/chat/devices", arktypeValidator("json", DeviceBody, invalidBody), async (c) => {
    const a = takeAuth(await requireAuth(c));
    if (!a.ok) return replyAuth(c, a.error);
    const id = parseDeviceId(c.req.valid("json").device_id);
    if (!id.ok) return err(c, id.error.status, id.error.message);
    const dev = await upsertDevice(c.env.DB, c.env, str(a.value.id), id.value);
    return c.json({ device_id: dev.id, user_id: dev.user_id, last_seen_at: dev.last_seen_at });
  })
  .get("/chat/pending", arktypeValidator("query", DeviceQuery, invalidQuery), async (c) => {
    const a = takeAuth(await requireAuth(c));
    if (!a.ok) return replyAuth(c, a.error);
    const id = parseDeviceId(c.req.valid("query").device_id);
    if (!id.ok) return err(c, id.error.status, id.error.message);
    const envs = await pendingEnvelopes(c.env.DB, c.env, str(a.value.id), id.value);
    if (!envs.ok) return err(c, envs.error.status, envs.error.message);
    return c.json({ envelopes: envs.value });
  })
  .post("/chat/ack", arktypeValidator("json", EnvelopeAck, invalidBody), async (c) => {
    const a = takeAuth(await requireAuth(c));
    if (!a.ok) return replyAuth(c, a.error);
    const body = c.req.valid("json");
    const acked = await ackEnvelopes(c.env.DB, c.env, str(a.value.id), body.device_id, body.ids);
    if (!acked.ok) return err(c, acked.error.status, acked.error.message);
    await pushToHub(c.env, acked.value.pushes);
    return c.json({ acked: acked.value.acked });
  })
  .post("/chat/read", arktypeValidator("json", EnvelopeAck, invalidBody), async (c) => {
    const a = takeAuth(await requireAuth(c));
    if (!a.ok) return replyAuth(c, a.error);
    const body = c.req.valid("json");
    const read = await readMessages(c.env.DB, c.env, str(a.value.id), body.device_id, body.ids);
    if (!read.ok) return err(c, read.error.status, read.error.message);
    await pushToHub(c.env, read.value.pushes);
    return c.json({ read: read.value.read });
  })
  .get("/conversations", arktypeValidator("query", ConvFolderQuery, invalidQuery), async (c) => {
    const a = takeAuth(await requireAuth(c));
    if (!a.ok) return replyAuth(c, a.error);
    const q = c.req.valid("query");
    let folder = q.folder || FOLDER_INBOX;
    if (folder !== FOLDER_INBOX && folder !== FOLDER_REQUESTS) return err(c, 400, "folder must be inbox or requests");
    let cursorAt = "";
    let cursorID = "";
    if ((q.cursor ?? "").trim()) {
      const dec = decodeChatCursor(q.cursor ?? "");
      if (!dec.ok) return err(c, 400, "invalid cursor");
      cursorAt = dec.ts;
      cursorID = dec.id;
    }
    const limit = queryLimit(q.limit, 30, 50);
    const uid = str(a.value.id);
    const rows = await all<Record<string, unknown>>(
      c.env.DB,
      `SELECT c.id, c.kind, c.title, c.photo_url, c.created_by, c.dm_key, c.created_at, c.updated_at,
              cm.role, cm.folder, cm.request_state, cm.muted, cm.last_read_at, cm.last_read_message_id
       FROM conversation_members cm JOIN conversations c ON c.id = cm.conversation_id
       WHERE cm.user_id = ? AND cm.left_at IS NULL AND cm.request_state != 'declined' AND cm.folder = ?
         AND (? = '' OR c.updated_at < ? OR (c.updated_at = ? AND c.id < ?))
         AND NOT (c.kind = 'dm' AND EXISTS (
           SELECT 1 FROM conversation_members other INNER JOIN blocks b ON (
             (b.blocker_id = ? AND b.blocked_id = other.user_id) OR (b.blocker_id = other.user_id AND b.blocked_id = ?)
           ) WHERE other.conversation_id = c.id AND other.user_id != ?
         ))
       ORDER BY c.updated_at DESC, c.id DESC LIMIT ?`,
      [uid, folder, cursorAt, cursorAt, cursorAt, cursorID, uid, uid, uid, limit + 1],
    );
    let next = "";
    let page = rows;
    if (rows.length > limit) {
      page = rows.slice(0, limit);
      const last = page[page.length - 1];
      if (last) next = encodeChatCursor(str(last.updated_at), str(last.id));
    }
    const heads: Access[] = page.map((row) => ({
      conv: {
        id: row.id,
        kind: row.kind,
        title: row.title,
        photo_url: row.photo_url,
        created_by: row.created_by,
        dm_key: row.dm_key,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      member: {
        role: row.role,
        folder: row.folder,
        request_state: row.request_state,
        muted: row.muted,
        last_read_at: row.last_read_at,
        last_read_message_id: row.last_read_message_id,
      },
    }));
    const conversations = await assemble(c.env.DB, a.value, heads);
    return c.json(next ? { conversations, next_cursor: next } : { conversations });
  })
  .post("/conversations", arktypeValidator("json", CreateConversation, invalidBody), async (c) => {
    const a = takeAuth(await requireAuth(c));
    if (!a.ok) return replyAuth(c, a.error);
    const req = c.req.valid("json");
    try {
      if (req.kind === KIND_DM) {
        const item = await createDM(c.env.DB, a.value, req);
        const status = item._status === 201 ? 201 : 200;
        delete item._status;
        return c.json(item, status);
      }
      if (req.kind === KIND_GROUP) {
        const item = await createGroup(c.env.DB, a.value, req);
        return c.json(item, 201);
      }
      return err(c, 400, "invalid conversation kind");
    } catch (e) {
      const h = catchHttp(e, "failed to create conversation");
      return err(c, h.status, h.message);
    }
  })
  .get("/conversations/:id", arktypeValidator("param", ConvIdParam, invalidParam), async (c) => {
    const a = takeAuth(await requireAuth(c));
    if (!a.ok) return replyAuth(c, a.error);
    try {
      return c.json(await writeConv(c.env.DB, a.value, c.req.valid("param").id));
    } catch (e) {
      const h = catchHttp(e, "failed to load conversation");
      return err(c, h.status, h.message);
    }
  })
  .post("/conversations/:id/accept", arktypeValidator("param", ConvIdParam, invalidParam), async (c) => {
    const a = takeAuth(await requireAuth(c));
    if (!a.ok) return replyAuth(c, a.error);
    try {
      const access = await loadAccess(c.env.DB, str(a.value.id), c.req.valid("param").id);
      if (str(access.conv.kind) !== KIND_DM || str(access.member.request_state) !== STATE_PENDING) {
        return err(c, 409, "message request is not pending");
      }
      const id = c.req.valid("param").id;
      await run(
        c.env.DB,
        "UPDATE conversation_members SET request_state = 'accepted', folder = 'inbox' WHERE conversation_id = ? AND user_id = ?",
        [id, str(a.value.id)],
      );
      await run(c.env.DB, "UPDATE conversations SET updated_at = ? WHERE id = ?", [nextStamp(), id]);
      return c.json(await writeConv(c.env.DB, a.value, id));
    } catch (e) {
      const h = catchHttp(e, "failed to accept request");
      return err(c, h.status, h.message);
    }
  })
  .post("/conversations/:id/decline", arktypeValidator("param", ConvIdParam, invalidParam), async (c) => {
    const a = takeAuth(await requireAuth(c));
    if (!a.ok) return replyAuth(c, a.error);
    try {
      const id = c.req.valid("param").id;
      const access = await loadAccess(c.env.DB, str(a.value.id), id);
      if (str(access.conv.kind) !== KIND_DM || str(access.member.request_state) !== STATE_PENDING) {
        return err(c, 409, "message request is not pending");
      }
      await run(
        c.env.DB,
        "UPDATE conversation_members SET request_state = 'declined', folder = 'requests' WHERE conversation_id = ? AND user_id = ?",
        [id, str(a.value.id)],
      );
      return c.json({ request_state: STATE_DECLINED });
    } catch (e) {
      const h = catchHttp(e, "failed to decline request");
      return err(c, h.status, h.message);
    }
  })
  .get(
    "/conversations/:id/messages",
    arktypeValidator("param", ConvIdParam, invalidParam),
    arktypeValidator("query", MessagesQuery, invalidQuery),
    async (c) => {
      const a = takeAuth(await requireAuth(c));
      if (!a.ok) return replyAuth(c, a.error);
      try {
        await loadAccess(c.env.DB, str(a.value.id), c.req.valid("param").id);
      } catch (e) {
        const h = catchHttp(e, "failed to load conversation");
        return err(c, h.status, h.message);
      }
      const id = c.req.valid("param").id;
      const q = c.req.valid("query");
      if (q.before && q.after) return err(c, 400, "use before or after, not both");
      const limit = queryLimit(q.limit, 50, 100);
      const vis = `AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = ? AND b.blocked_id = m.sender_id)
      OR (b.blocker_id = m.sender_id AND b.blocked_id = ?))
     AND m.removed_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM users banned_sender WHERE banned_sender.id = m.sender_id AND banned_sender.banned_at IS NOT NULL)`;
      let rows: Record<string, unknown>[] = [];
      let hasOlder = false;
      const uid = str(a.value.id);
      if (q.after) {
        const dec = decodeChatCursor(q.after);
        if (!dec.ok || !dec.ts) return err(c, 400, "invalid cursor");
        rows = await all(
          c.env.DB,
          `SELECT m.* FROM messages m WHERE m.conversation_id = ?
            AND (m.created_at > ? OR (m.created_at = ? AND m.id > ?)) ${vis}
           ORDER BY m.created_at ASC, m.id ASC LIMIT ?`,
          [id, dec.ts, dec.ts, dec.id, uid, uid, limit + 1],
        );
        if (rows.length > limit) rows = rows.slice(0, limit);
      } else {
        let beforeAt = "";
        let beforeId = "";
        if (q.before) {
          const dec = decodeChatCursor(q.before);
          if (!dec.ok || !dec.ts) return err(c, 400, "invalid cursor");
          beforeAt = dec.ts;
          beforeId = dec.id;
        }
        rows = await all(
          c.env.DB,
          `SELECT m.* FROM messages m WHERE m.conversation_id = ?
            AND (? = '' OR m.created_at < ? OR (m.created_at = ? AND m.id < ?)) ${vis}
           ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
          [id, beforeAt, beforeAt, beforeAt, beforeId, uid, uid, limit + 1],
        );
        if (rows.length > limit) {
          hasOlder = true;
          rows = rows.slice(0, limit);
        }
        rows.reverse();
      }
      const presented = await presentMessages(c.env.DB, a.value, rows);
      const body: Record<string, unknown> = { messages: presented };
      if (presented.length) {
        const newest = presented[presented.length - 1] as { created_at: string; id: string };
        if (hasOlder) {
          const oldest = presented[0] as { created_at: string; id: string };
          body.next_before = encodeChatCursor(oldest.created_at, oldest.id);
        }
        body.next_after = encodeChatCursor(newest.created_at, newest.id);
      }
      return c.json(body);
    },
  )
  .post(
    "/conversations/:id/messages",
    arktypeValidator("param", ConvIdParam, invalidParam),
    arktypeValidator("json", SendMessageBody, invalidBody),
    async (c) => {
      const a = takeAuth(await requireAuth(c));
      if (!a.ok) return replyAuth(c, a.error);
      const id = c.req.valid("param").id;
      let access: Access;
      try {
        access = await loadAccess(c.env.DB, str(a.value.id), id);
      } catch (e) {
        const h = catchHttp(e, "failed to load conversation");
        return err(c, h.status, h.message);
      }
      const decoded = c.req.valid("json");
      const outbound = validateOutbound(decoded.kind, decoded.body ?? "", decoded.image_url ?? "", decoded.event_id ?? "");
      if (!outbound.ok) return err(c, 400, outbound.error);
      if (str(access.member.request_state) === STATE_PENDING) return err(c, 403, "accept the request before sending");
      const members = await listActiveMembers(c.env.DB, [id]);
      if (str(access.conv.kind) === KIND_DM) {
        for (const member of members) {
          if (str(member.user_id) === str(a.value.id)) continue;
          if (str(member.request_state) === STATE_DECLINED) return err(c, 403, "message request was declined");
          const peer = await getUser(c.env.DB, str(member.user_id));
          if (!peer) return err(c, 400, "failed to send message");
          const follows = await followsAccepted(c.env.DB, str(member.user_id), str(a.value.id));
          if (canContact(personFromUser(a.value), personFromUser(peer), follows)) {
            return err(c, 403, "adults cannot message a teen who does not follow them");
          }
        }
      }
      const replyTo = decoded.reply_to ?? "";
      if (replyTo) {
        const parent = await one<Record<string, unknown>>(c.env.DB, "SELECT * FROM messages WHERE id = ?", [replyTo]);
        if (!parent || str(parent.conversation_id) !== id || parent.unsent_at) {
          return err(c, 400, "reply_to is not in this conversation");
        }
        if (str(parent.sender_id) !== str(a.value.id) && (await blockedEitherWay(c.env.DB, str(a.value.id), str(parent.sender_id)))) {
          return err(c, 400, "reply_to is not in this conversation");
        }
      }
      if (outbound.value.kind === MSG_EVENT) {
        const event = await one<EventRow>(c.env.DB, "SELECT * FROM events WHERE id = ?", [outbound.value.eventId]);
        if (!event || !(await eventVisible(c.env.DB, a.value, event))) return err(c, 404, "event not found");
      }
      if (!limiter.allow(str(a.value.id))) return err(c, 429, "too many messages");
      const stamp = nextStamp();
      const msgId = crypto.randomUUID();
      await run(
        c.env.DB,
        `INSERT INTO messages (id, conversation_id, sender_id, kind, body, image_url, event_id, reply_to_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          msgId,
          id,
          str(a.value.id),
          outbound.value.kind,
          outbound.value.body || null,
          outbound.value.imageUrl || null,
          outbound.value.eventId || null,
          replyTo || null,
          stamp,
        ],
      );
      await run(c.env.DB, "UPDATE conversations SET updated_at = ? WHERE id = ?", [stamp, id]);
      const saved = await one<Record<string, unknown>>(c.env.DB, "SELECT * FROM messages WHERE id = ?", [msgId]);
      if (!saved) return err(c, 400, "failed to send message");
      const pushes = await fanoutRelay(c.env.DB, c.env, saved, members, (user, msg) => presentMessages(c.env.DB, user, [msg]));
      await pushToHub(c.env, pushes);
      const presented = await presentMessages(c.env.DB, a.value, [saved]);
      return c.json(presented[0] ?? saved, 201);
    },
  );

async function createDM(
  db: D1Database,
  actor: UserRow,
  req: CreateConversation,
): Promise<Record<string, unknown> & { _status?: 200 | 201 }> {
  if ((req.title ?? "").trim() || (req.photo_url ?? "").trim() || (req.member_ids ?? []).length) {
    throw new HTTPError(400, "invalid request body");
  }
  const otherID = (req.user_id ?? "").trim();
  if (!otherID) throw new HTTPError(400, "user_id is required");
  if (otherID === str(actor.id)) throw new HTTPError(400, "cannot message yourself");
  const other = await getUser(db, otherID);
  if (!other) throw new HTTPError(404, "user not found");
  if (await blockedEitherWay(db, str(actor.id), otherID)) throw new HTTPError(404, "user not found");
  const follows = await followsAccepted(db, otherID, str(actor.id));
  if (canContact(personFromUser(actor), personFromUser(other), follows)) {
    throw new HTTPError(403, "adults cannot message a teen who does not follow them");
  }
  const key = dmKey(str(actor.id), otherID);
  const existing = await one<Record<string, unknown>>(db, "SELECT * FROM conversations WHERE dm_key = ?", [key]);
  if (existing) {
    await finishExistingDM(db, actor, other, existing, follows);
    const item = await writeConv(db, actor, str(existing.id));
    return { ...item, _status: 200 };
  }
  const stamp = nextStamp();
  const convID = crypto.randomUUID();
  const place = dmPlacement(follows);
  await run(db, `INSERT INTO conversations (id, kind, created_by, dm_key, created_at, updated_at) VALUES (?, 'dm', ?, ?, ?, ?)`, [
    convID,
    str(actor.id),
    key,
    stamp,
    stamp,
  ]);
  await run(
    db,
    `INSERT INTO conversation_members (conversation_id, user_id, role, folder, request_state, muted, joined_at)
     VALUES (?, ?, 'member', 'inbox', 'accepted', 0, ?)`,
    [convID, str(actor.id), stamp],
  );
  await run(
    db,
    `INSERT INTO conversation_members (conversation_id, user_id, role, folder, request_state, muted, joined_at)
     VALUES (?, ?, 'member', ?, ?, 0, ?)`,
    [convID, otherID, place.folder, place.state, nextStamp()],
  );
  const item = await writeConv(db, actor, convID);
  return { ...item, _status: 201 };
}

async function finishExistingDM(
  db: D1Database,
  actor: UserRow,
  other: UserRow,
  conv: Record<string, unknown>,
  otherFollowsActor: boolean,
): Promise<void> {
  const viewerMember = await one<Record<string, unknown>>(
    db,
    "SELECT * FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
    [str(conv.id), str(actor.id)],
  );
  if (!viewerMember || viewerMember.left_at) throw new HTTPError(404, "conversation not found");
  const peer = await one<Record<string, unknown>>(
    db,
    "SELECT * FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
    [str(conv.id), str(other.id)],
  );
  if (!peer) throw new HTTPError(400, "failed to create conversation");
  let changed = false;
  if (str(peer.request_state) === STATE_DECLINED && str(viewerMember.request_state) === STATE_ACCEPTED) {
    const place = dmPlacement(otherFollowsActor);
    await run(db, "UPDATE conversation_members SET request_state = ?, folder = ? WHERE conversation_id = ? AND user_id = ?", [
      place.state,
      place.folder,
      str(conv.id),
      str(other.id),
    ]);
    changed = true;
  }
  if (str(viewerMember.request_state) === STATE_DECLINED) {
    await run(
      db,
      "UPDATE conversation_members SET request_state = 'accepted', folder = 'inbox' WHERE conversation_id = ? AND user_id = ?",
      [str(conv.id), str(actor.id)],
    );
    changed = true;
  }
  if (changed) await run(db, "UPDATE conversations SET updated_at = ? WHERE id = ?", [nextStamp(), str(conv.id)]);
}

async function createGroup(db: D1Database, actor: UserRow, req: CreateConversation): Promise<Record<string, unknown>> {
  if ((req.user_id ?? "").trim()) throw new HTTPError(400, "invalid request body");
  const title = normalizeTitle(req.title ?? "");
  if (!title.ok) throw new HTTPError(400, "invalid title");
  const photo = normalizeHttpUrl(req.photo_url ?? "");
  if (!photo.ok) throw new HTTPError(400, "invalid photo url");
  const ids = uniqueIDs(req.member_ids, str(actor.id));
  if (roomFor(1, ids.length)) throw new HTTPError(409, "group is full");
  if (ids.length) await screenInvitees(db, actor, ids, []);
  const stamp = nextStamp();
  const convID = crypto.randomUUID();
  await run(
    db,
    `INSERT INTO conversations (id, kind, title, photo_url, created_by, created_at, updated_at)
     VALUES (?, 'group', ?, ?, ?, ?, ?)`,
    [convID, title.value, photo.value || null, str(actor.id), stamp, stamp],
  );
  await run(
    db,
    `INSERT INTO conversation_members (conversation_id, user_id, role, folder, request_state, muted, joined_at)
     VALUES (?, ?, 'admin', 'inbox', 'accepted', 0, ?)`,
    [convID, str(actor.id), stamp],
  );
  for (const id of ids) {
    await run(
      db,
      `INSERT INTO conversation_members (conversation_id, user_id, role, folder, request_state, muted, joined_at)
       VALUES (?, ?, 'member', 'inbox', 'accepted', 0, ?)`,
      [convID, id, nextStamp()],
    );
  }
  return writeConv(db, actor, convID);
}
