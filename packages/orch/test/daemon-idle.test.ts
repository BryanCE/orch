import { describe, expect, test } from "bun:test";
import { idleShutdownDue } from "../src/daemon/orchd.ts";

describe("orchd idle shutdown rule", () => {
  test("a zero setting disables idle shutdown entirely", () => {
    expect(idleShutdownDue({ idleMinutes: 0, liveAgents: 0, subscribers: 0, msSinceActivity: Number.MAX_SAFE_INTEGER })).toBe(false);
  });

  test("a live agent holds the daemon open however long it has been quiet", () => {
    expect(idleShutdownDue({ idleMinutes: 30, liveAgents: 1, subscribers: 0, msSinceActivity: 90 * 60_000 })).toBe(false);
  });

  test("an event subscriber holds the daemon open", () => {
    expect(idleShutdownDue({ idleMinutes: 30, liveAgents: 0, subscribers: 1, msSinceActivity: 90 * 60_000 })).toBe(false);
  });

  test("recent activity holds the daemon open below the threshold", () => {
    expect(idleShutdownDue({ idleMinutes: 30, liveAgents: 0, subscribers: 0, msSinceActivity: 29 * 60_000 })).toBe(false);
  });

  test("a fully idle daemon past the threshold is due to exit", () => {
    expect(idleShutdownDue({ idleMinutes: 30, liveAgents: 0, subscribers: 0, msSinceActivity: 30 * 60_000 })).toBe(true);
  });
});
