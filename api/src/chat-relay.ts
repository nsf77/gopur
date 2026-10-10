import type { D1Database } from "@cloudflare/workers-types";
import { all, one, placeholders, run } from "./db";
import { blockedEitherWay, getUser, str, type UserRow } from "./event";
import { nextStamp } from "./chat-rules";
import type { Bindings } from "./types";

export const KIND_MESSAGE = "chat_message";
export const KIND_RECEIPT = "chat_receipt";
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EnvelopeFrame = Record<string, unknown>;
export type DevicePush = { userId: string; deviceId: string; frame: EnvelopeFrame };

export type RelayFail = { status: 400 | 404; message: string };
export type RelayOutcome<T> = { ok: true; value: T } | { ok: false; error: RelayFail };

function fail(status: 400 | 404, message: string): RelayOutcome<never> {
  return { ok: false, error: { status, message } };
}

export function relayTtlMs(env: Bindings): number {
  const n = Number(env.CHAT_RELAY_TTL_SECONDS ?? "");
  if (Number.isFinite(n) && n > 0) return n * 1000;
  return 30 * 24 * 3600 * 1000;
}

export function relayCutoff(env: Bindings): string {
  const iso = new Date(Date.now() - relayTtlMs(env)).toISOString();
  const [date, rest] = iso.split("T");
  const time = (rest ?? "").replace(/Z$/, "");
  const [hms, ms = "000"] = time.split(".");
  return `${date}T${hms}.${ms.padEnd(9, "0")}Z`;
}

export function parseDeviceId(raw: string): RelayOutcome<string> {
  const id = (raw ?? "").trim();
  if (!id) return fail(400, "device_id is required");
  if (!UUID_RE.test(id)) return fail(400, "invalid device_id");
  return { ok: true, value: id };
}

export async function pruneRelay(db: D1Database, env: Bindings): Promise<void> {
  const cut = relayCutoff(env);
  await run(db, "DELETE FROM chat_devices WHERE last_seen_at < ?", [cut]);
  await run(db, "DELETE FROM chat_envelopes WHERE created_at < ?", [cut]);
  const old = await all<{ id: string }>(
    db,
    "SELECT id FROM messages WHERE created_at < ? AND body_deleted_at IS NULL AND unsent_at IS NULL",
    [cut],
  );
  const stamp = nextStamp();
  for (const row of old) {
    await run(
      db,
      "UPDATE messages SET body = NULL, image_url = NULL, event_id = NULL, body_deleted_at = ? WHERE id = ? AND body_deleted_at IS NULL AND unsent_at IS NULL",
      [stamp, row.id],
    );
  }
}

export async function upsertDevice(
  db: D1Database,
  env: Bindings,
  userId: string,
  deviceId: string,
): Promise<{ id: string; user_id: string; last_seen_at: string }> {
  await pruneRelay(db, env);
  const at = nextStamp();
  await run(
    db,
    `INSERT INTO chat_devices (id, user_id, last_seen_at, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, last_seen_at = excluded.last_seen_at`,
    [deviceId, userId, at, at],
  );
  const row = await one<{ id: string; user_id: string; last_seen_at: string }>(
    db,
    "SELECT id, user_id, last_seen_at FROM chat_devices WHERE id = ?",
    [deviceId],
  );
  return row ?? { id: deviceId, user_id: userId, last_seen_at: at };
}

async function deviceForUser(
  db: D1Database,
  userId: string,
  deviceId: string,
): Promise<RelayOutcome<Record<string, unknown>>> {
  const dev = await one<Record<string, unknown>>(db, "SELECT * FROM chat_devices WHERE id = ?", [deviceId]);
  if (!dev || str(dev.user_id) !== userId) return fail(404, "device not found");
  return { ok: true, value: dev };
}

function parseEnvelope(row: Record<string, unknown>): EnvelopeFrame | null {
  try {
    return JSON.parse(String(row.payload)) as EnvelopeFrame;
  } catch {
    return null;
  }
}

export async function pendingEnvelopes(
  db: D1Database,
  env: Bindings,
  userId: string,
  deviceId: string,
): Promise<RelayOutcome<EnvelopeFrame[]>> {
  await pruneRelay(db, env);
  const dev = await deviceForUser(db, userId, deviceId);
  if (!dev.ok) return fail(dev.error.status, dev.error.message);
  const rows = await all<Record<string, unknown>>(
    db,
    "SELECT * FROM chat_envelopes WHERE device_id = ? AND user_id = ? ORDER BY created_at ASC, id ASC LIMIT 200",
    [deviceId, userId],
  );
  const frames: EnvelopeFrame[] = [];
  for (const row of rows) {
    const parsed = parseEnvelope(row);
    if (parsed) frames.push(parsed);
  }
  return { ok: true, value: frames };
}

async function enqueueReceipt(db: D1Database, env: Bindings, messageId: string, status: string, at: string): Promise<DevicePush[]> {
  const msg = await one<Record<string, unknown>>(db, "SELECT * FROM messages WHERE id = ?", [messageId]);
  if (!msg) return [];
  const cut = relayCutoff(env);
  const devs = await all<Record<string, unknown>>(
    db,
    "SELECT * FROM chat_devices WHERE user_id = ? AND last_seen_at >= ?",
    [str(msg.sender_id), cut],
  );
  const stamp = nextStamp();
  const pushes: DevicePush[] = [];
  for (const dev of devs) {
    const envId = crypto.randomUUID();
    const frame: EnvelopeFrame = {
      id: envId,
      type: "receipt",
      conversation_id: msg.conversation_id,
      message_id: messageId,
      created_at: stamp,
      status,
      at,
    };
    await run(
      db,
      `INSERT INTO chat_envelopes (id, device_id, user_id, kind, conversation_id, message_id, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [envId, str(dev.id), str(dev.user_id), KIND_RECEIPT, str(msg.conversation_id), messageId, JSON.stringify(frame), stamp],
    );
    pushes.push({ userId: str(dev.user_id), deviceId: str(dev.id), frame });
  }
  return pushes;
}

async function onDelivered(db: D1Database, env: Bindings, messageId: string, userId: string): Promise<DevicePush[]> {
  const stamp = nextStamp();
  await run(
    db,
    "UPDATE message_receipts SET delivered_at = ? WHERE message_id = ? AND user_id = ? AND delivered_at IS NULL",
    [stamp, messageId, userId],
  );
  const open = await one<{ n: number }>(
    db,
    "SELECT COUNT(*) AS n FROM message_receipts WHERE message_id = ? AND delivered_at IS NULL",
    [messageId],
  );
  if (Number(open?.n ?? 0) === 0) return enqueueReceipt(db, env, messageId, "delivered", stamp);
  return [];
}

async function maybePurge(db: D1Database, messageId: string): Promise<void> {
  const left = await one<{ n: number }>(
    db,
    "SELECT COUNT(*) AS n FROM chat_envelopes WHERE message_id = ? AND kind = ?",
    [messageId, KIND_MESSAGE],
  );
  if (Number(left?.n ?? 0) === 0) {
    await run(
      db,
      "UPDATE messages SET body = NULL, image_url = NULL, event_id = NULL, body_deleted_at = ? WHERE id = ? AND body_deleted_at IS NULL AND unsent_at IS NULL",
      [nextStamp(), messageId],
    );
  }
}

export async function ackEnvelopes(
  db: D1Database,
  env: Bindings,
  userId: string,
  deviceId: string,
  ids: string[],
): Promise<RelayOutcome<{ acked: number; pushes: DevicePush[] }>> {
  const parsed = parseDeviceId(deviceId);
  if (!parsed.ok) return fail(parsed.error.status, parsed.error.message);
  const dev = await deviceForUser(db, userId, parsed.value);
  if (!dev.ok) return fail(dev.error.status, dev.error.message);
  await pruneRelay(db, env);
  if (!ids.length) return { ok: true, value: { acked: 0, pushes: [] } };
  let n = 0;
  const msgs = new Set<string>();
  const pushes: DevicePush[] = [];
  for (const id of ids) {
    const row = await one<Record<string, unknown>>(
      db,
      "SELECT * FROM chat_envelopes WHERE id = ? AND device_id = ? AND user_id = ?",
      [id, parsed.value, userId],
    );
    if (!row) continue;
    await run(db, "DELETE FROM chat_envelopes WHERE id = ? AND device_id = ? AND user_id = ?", [id, parsed.value, userId]);
    n++;
    if (str(row.kind) === KIND_MESSAGE) {
      pushes.push(...(await onDelivered(db, env, str(row.message_id), userId)));
      msgs.add(str(row.message_id));
    }
  }
  for (const mid of msgs) await maybePurge(db, mid);
  return { ok: true, value: { acked: n, pushes } };
}

export async function readMessages(
  db: D1Database,
  env: Bindings,
  userId: string,
  deviceId: string,
  ids: string[],
): Promise<RelayOutcome<{ read: number; pushes: DevicePush[] }>> {
  const parsed = parseDeviceId(deviceId);
  if (!parsed.ok) return fail(parsed.error.status, parsed.error.message);
  const dev = await deviceForUser(db, userId, parsed.value);
  if (!dev.ok) return fail(dev.error.status, dev.error.message);
  let n = 0;
  const stamp = nextStamp();
  const pushes: DevicePush[] = [];
  for (const id of ids) {
    if (!String(id).trim()) continue;
    await run(
      db,
      "UPDATE message_receipts SET read_at = ?, delivered_at = COALESCE(delivered_at, ?) WHERE message_id = ? AND user_id = ? AND read_at IS NULL",
      [stamp, stamp, id, userId],
    );
    n++;
    const open = await one<{ n: number }>(
      db,
      "SELECT COUNT(*) AS n FROM message_receipts WHERE message_id = ? AND read_at IS NULL",
      [id],
    );
    if (Number(open?.n ?? 0) === 0) pushes.push(...(await enqueueReceipt(db, env, id, "read", stamp)));
  }
  return { ok: true, value: { read: n, pushes } };
}

export async function fanoutRelay(
  db: D1Database,
  env: Bindings,
  saved: Record<string, unknown>,
  members: Record<string, unknown>[],
  present: (user: UserRow, msg: Record<string, unknown>) => Promise<Record<string, unknown>[]>,
): Promise<DevicePush[]> {
  await pruneRelay(db, env);
  const senderId = str(saved.sender_id);
  const recipients: string[] = [];
  for (const m of members) {
    const uid = str(m.user_id);
    if (uid === senderId) continue;
    if (await blockedEitherWay(db, senderId, uid)) continue;
    recipients.push(uid);
    await run(db, "INSERT INTO message_receipts (message_id, user_id) VALUES (?, ?) ON CONFLICT(message_id, user_id) DO NOTHING", [
      str(saved.id),
      uid,
    ]);
  }
  if (!recipients.length) return [];
  const cut = relayCutoff(env);
  const ph = placeholders(recipients.length);
  const devs = await all<Record<string, unknown>>(
    db,
    `SELECT * FROM chat_devices WHERE user_id IN (${ph}) AND last_seen_at >= ?`,
    [...recipients, cut],
  );
  const stamp = nextStamp();
  const pushes: DevicePush[] = [];
  for (const dev of devs) {
    const user = await getUser(db, str(dev.user_id));
    if (!user) continue;
    const presented = await present(user, saved);
    const first = presented[0];
    if (presented.length !== 1 || !first) continue;
    const envId = crypto.randomUUID();
    const frame: EnvelopeFrame = {
      id: envId,
      type: "message",
      conversation_id: saved.conversation_id,
      message_id: saved.id,
      created_at: stamp,
      message: first,
    };
    await run(
      db,
      `INSERT INTO chat_envelopes (id, device_id, user_id, kind, conversation_id, message_id, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [envId, str(dev.id), str(dev.user_id), KIND_MESSAGE, str(saved.conversation_id), str(saved.id), JSON.stringify(frame), stamp],
    );
    pushes.push({ userId: str(dev.user_id), deviceId: str(dev.id), frame });
  }
  return pushes;
}

export async function handleWsClient(
  db: D1Database,
  env: Bindings,
  userId: string,
  deviceId: string,
  raw: string,
): Promise<{ ok: true; value: DevicePush[] } | { ok: false }> {
  let v: { type?: string; ids?: unknown };
  try {
    v = JSON.parse(raw) as { type?: string; ids?: unknown };
  } catch {
    return { ok: false };
  }
  const ids = Array.isArray(v.ids) ? v.ids.map(String) : [];
  if (v.type === "ack") {
    if (deviceId) {
      const r = await ackEnvelopes(db, env, userId, deviceId, ids);
      return { ok: true, value: r.ok ? r.value.pushes : [] };
    }
    return { ok: true, value: [] };
  }
  if (v.type === "read") {
    if (deviceId) {
      const r = await readMessages(db, env, userId, deviceId, ids);
      return { ok: true, value: r.ok ? r.value.pushes : [] };
    }
    return { ok: true, value: [] };
  }
  return { ok: false };
}

export async function pushToHub(env: Bindings, pushes: DevicePush[]): Promise<void> {
  if (!pushes.length) return;
  const byUser = new Map<string, DevicePush[]>();
  for (const p of pushes) {
    const list = byUser.get(p.userId) ?? [];
    list.push(p);
    byUser.set(p.userId, list);
  }
  await Promise.all(
    [...byUser.entries()].map(([userId, items]) => {
      const stub = env.CHAT_HUB.get(env.CHAT_HUB.idFromName(userId));
      return stub.fetch("https://chat-hub/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(items.map((i) => ({ device_id: i.deviceId, frame: i.frame }))),
      });
    }),
  );
}

