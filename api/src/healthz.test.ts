import { describe, expect, test } from "bun:test";
import app from "./index";

describe("GET /healthz", () => {
  test("returns { ok: true }", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
