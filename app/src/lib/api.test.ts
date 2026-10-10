import { describe, expect, test } from "bun:test";
import app from "api";
import { createApiClient, fetchHealth } from "./api";

describe("fetchHealth", () => {
  test("returns { ok: true } via Hono RPC against the Worker app", async () => {
    const client = createApiClient("http://gopur.test", (input, init) =>
      app.request(input, init),
    );
    await expect(fetchHealth(client)).resolves.toEqual({ ok: true });
  });
});
