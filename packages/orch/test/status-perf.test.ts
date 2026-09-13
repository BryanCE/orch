import { describe, expect, test } from "bun:test";
import { fleetStatusRows } from "../src/commands/status.ts";
import { testServices } from "./helpers/services.ts";
import type { OrchSettings } from "../src/types/settings.ts";
function testSettings(): OrchSettings {
  return testServices({ orchDir: ".", settings: {} }).settings.current();
}

describe("status performance seams", () => {
  test("resolves bundle hashes once per status call", () => {
    let calls = 0;
    fleetStatusRows(testSettings(), testSettings().spaces, { directory: ".", bundleHashes: () => { calls += 1; return new Set<string>(); } });
    expect(calls).toBe(1);
  });

  test("resolves orchestrator id once per status call", () => {
    let calls = 0;
    fleetStatusRows(testSettings(), testSettings().spaces, { directory: ".", orchId: () => { calls += 1; return null; } });
    expect(calls).toBe(1);
  });
});
