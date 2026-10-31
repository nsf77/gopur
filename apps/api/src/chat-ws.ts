import { getUser, str } from "./event";
import { restrictionCode } from "./profile";
import { verifyToken } from "./jwt";
import { authConfig } from "./config";
import { parseDeviceId, upsertDevice } from "./chat-relay";
import type { Bindings } from "./types";

export function websocketToken(headers: Headers, url: URL): { token: string; subprotocol: string } {
  const auth = headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return { token: auth.slice(7).trim(), subprotocol: "" };
  const qToken = (url.searchParams.get("token") ?? "").trim();
  if (qToken) return { token: qToken, subprotocol: "" };
  const qAccess = (url.searchParams.get("access_token") ?? "").trim();
  if (qAccess) return { token: qAccess, subprotocol: "" };
  let jwt = "";
  let sawBearer = false;
  let bearerCasing = "";
  for (const part of (headers.get("sec-websocket-protocol") ?? "").split(",")) {
    const p = part.trim();
    if (!p) continue;
    if (p.toLowerCase() === "bearer") {
      sawBearer = true;
      bearerCasing = p;
      continue;
    }
    if (!jwt) jwt = p;
  }
  if (!jwt) return { token: "", subprotocol: "" };
  if (sawBearer) return { token: jwt, subprotocol: bearerCasing };
  return { token: jwt, subprotocol: jwt };
}

function jsonErr(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function loadChatSocketUser(
  request: Request,
  env: Bindings,
): Promise<{ userId: string; deviceId: string; subprotocol: string } | Response> {
  const url = new URL(request.url);
  const { token, subprotocol } = websocketToken(request.headers, url);
  if (!token) return jsonErr(401, "unauthorized");
  const userId = await verifyToken(token, authConfig(env).jwtSecret);
  if (!userId) return jsonErr(401, "invalid or expired token");
  const user = await getUser(env.DB, userId);
  if (!user) return jsonErr(401, "invalid or expired token");
  const code = restrictionCode(user);
  if (code) {
    return jsonErr(403, code === "account_banned" ? "account banned" : "account suspended");
  }
  let deviceId = (url.searchParams.get("device_id") ?? "").trim();
  const parsed = parseDeviceId(deviceId);
  if (parsed.ok) {
    await upsertDevice(env.DB, env, userId, parsed.value);
    deviceId = parsed.value;
  } else deviceId = "";
  return { userId: str(user.id), deviceId, subprotocol };
}

export async function handleChatUpgrade(request: Request, env: Bindings): Promise<Response> {
  const loaded = await loadChatSocketUser(request, env);
  if (loaded instanceof Response) return loaded;
  const stub = env.CHAT_HUB.get(env.CHAT_HUB.idFromName(loaded.userId));
  return stub.fetch(request as never);
}
