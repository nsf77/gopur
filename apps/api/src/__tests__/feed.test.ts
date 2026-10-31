import { describe, expect, it } from "vitest";
import { feedConfig } from "../feed-config";
import { score } from "../feed";
import { parseBirthdate } from "../age";

describe("feed score", () => {
  it("returns a positive score for a nearby soon event", () => {
    const value = score(feedConfig, {
      hasDistance: true,
      distanceKm: 2,
      daysUntilStart: 1,
      spanDays: 0.1,
      followsHost: false,
      popularitySignals: 4,
      age: 28,
      ageMin: 18,
      ageMax: 80,
      interestShare: 0.2,
      source: "host",
      dateTbc: false,
    });
    expect(value).toBeGreaterThan(0);
  });
});

describe("parseBirthdate", () => {
  it("computes age from an ISO date", () => {
    const age = parseBirthdate("2000-01-01", new Date("2026-01-01T00:00:00Z"));
    expect(age).toBe(26);
  });
});
