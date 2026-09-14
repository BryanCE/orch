import { describe, expect, test } from "bun:test";
import { fleetStatusRows } from "../src/commands/status/rows.ts";
import { testServices } from "./helpers/services.ts";
import { tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { OrchSettings } from "../src/types/settings.ts";
const testDir: OrchDir = tempOrchDir("orch-status-perf-");

function testSettings(): OrchSettings {
  return testServices({ orchDir: testDir, settings: {} }).settings.current();
}

describe("status performance seams", () => {
  test("resolves bundle hashes once per status call", () => {
    let calls = 0;
    fleetStatusRows(testSettings(), testSettings().spaces, { directory: testDir, bundleHashes: () => { calls += 1; return new Set<string>(); } });
    expect(calls).toBe(1);
  });

  test("resolves orchestrator id once per status call", () => {
    let calls = 0;
    fleetStatusRows(testSettings(), testSettings().spaces, { directory: testDir, orchId: () => { calls += 1; return null; } });
    expect(calls).toBe(1);
  });
});
