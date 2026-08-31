import { describe, expect, test } from "bun:test";
import { fleetStatusRows } from "../src/commands/status.ts";

describe("status performance seams", () => {
  test("resolves bundle hashes once per status call", () => {
    let calls = 0;
    fleetStatusRows({}, { bundleHashes: () => { calls += 1; return new Set<string>(); } });
    expect(calls).toBe(1);
  });

  test("resolves orchestrator id once per status call", () => {
    let calls = 0;
    fleetStatusRows({}, { orchId: () => { calls += 1; return null; } });
    expect(calls).toBe(1);
  });
});
