import { describe, expect, test } from "bun:test";
import { durationInstant, durationSpan } from "../src/cli/duration.ts";
import { UsageError } from "../src/cli/spec.ts";

const NOW = Date.parse("2026-09-29T12:00:00Z");

describe("the shared duration grammar", () => {
  test("--since: a bare number is epoch milliseconds, an age counts back from now, a date/time is itself", () => {
    expect(durationInstant("1700000000000", NOW)).toBe(1_700_000_000_000);
    expect(durationInstant("30s", NOW)).toBe(NOW - 30_000);
    expect(durationInstant("10m", NOW)).toBe(NOW - 600_000);
    expect(durationInstant("2h", NOW)).toBe(NOW - 7_200_000);
    expect(durationInstant("1d", NOW)).toBe(NOW - 86_400_000);
    expect(durationInstant("2026-09-29T11:00:00Z", NOW)).toBe(NOW - 3_600_000);
  });

  test("--timeout: a bare number is milliseconds, an age is its span, a date/time is the time left", () => {
    expect(durationSpan("1500", NOW)).toBe(1500);
    expect(durationSpan("30s", NOW)).toBe(30_000);
    expect(durationSpan("2026-09-29T12:05:00Z", NOW)).toBe(300_000);
  });

  test("anything else is a usage refusal", () => {
    for (const text of ["", "soon"]) {
      expect(() => durationInstant(text, NOW), text).toThrow(UsageError);
      expect(() => durationSpan(text, NOW), text).toThrow(/invalid duration/);
    }
  });
});
