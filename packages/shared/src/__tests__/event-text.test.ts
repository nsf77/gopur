import { describe, expect, it } from "vitest";
import { formatHkdDollars, parseHongKongDateTime } from "../index";

describe("formatHkdDollars", () => {
  it("formats whole dollars without cents", () => {
    expect(formatHkdDollars(5000)).toBe("50");
  });
});

describe("parseHongKongDateTime", () => {
  it("parses Hong Kong wall time to UTC ISO", () => {
    const iso = parseHongKongDateTime("2026-10-31 18:00");
    expect(iso).toBe("2026-10-31T10:00:00.000Z");
  });
});
