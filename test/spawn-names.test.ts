import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordSpawned } from "../src/presence/store.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { assertNameFree, assertValidAgentName, liveNamedRecords, nextNameIndex } from "../src/policy/name.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];
let previousOrchDir: string | undefined;

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-spawn-names-"));
  directories.push(directory);
  process.env.ORCH_DIR = directory;
  return directory;
}

/** A live named agent: a spawn record plus a presence status naming this pid. */
function seedLiveAgent(orchDir: string, key: string, name: string, workspace: string): void {
  recordSpawned(key, { workspace, handle: key });
  registerSpawnedAgent(orchDir, { key, harnessId: "pi", backendId: "herdr", pane: true, handle: key, cwd: orchDir, name, model: "test", spawner: null });
  seedStatus(orchDir, key, { agent: "pi", pid: process.pid, state: "idle" });
}

beforeEach(() => {
  previousOrchDir = process.env.ORCH_DIR;
});

afterEach(() => {
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

describe("agent name validation", () => {
  test("rejects names outside herdr's naming rule", () => {
    for (const name of ["Reviewer", "a~b", "a".repeat(33), ""]) {
      expect(() => assertValidAgentName(name)).toThrow(/must match \^\[a-z\]\[a-z0-9_-\]\{0,31\}\$/);
    }
  });

  test("accepts lowercase names with hyphens and underscores", () => {
    expect(() => assertValidAgentName("review-1")).not.toThrow();
    expect(() => assertValidAgentName("a_b2")).not.toThrow();
  });
});

describe("spawn name numbering", () => {
  test("starts at 1 when no agent under the prefix is live", () => {
    tempOrchDir();
    expect(nextNameIndex("recon", "w1")).toBe(1);
  });

  test("continues past the highest live index so a live fleet is grown, not collided with", () => {
    const orchDir = tempOrchDir();
    seedLiveAgent(orchDir, "herdr~w1~a1", "recon-1", "w1");
    seedLiveAgent(orchDir, "herdr~w1~a3", "recon-3", "w1");

    expect(liveNamedRecords("recon", "w1")).toHaveLength(2);
    expect(nextNameIndex("recon", "w1")).toBe(4);
    expect(() => assertNameFree("recon-1", "w1")).toThrow(/already live/);
    expect(() => assertNameFree("recon-4", "w1")).not.toThrow();
  });

  test("a dead agent frees its name and its index", () => {
    const orchDir = tempOrchDir();
    recordSpawned("herdr~w1~dead", { workspace: "w1", handle: "herdr~w1~dead" });
    registerSpawnedAgent(orchDir, { key: "herdr~w1~dead", harnessId: "pi", backendId: "herdr", pane: true, handle: "herdr~w1~dead", cwd: orchDir, name: "recon-1", model: "test", spawner: null });
    seedStatus(orchDir, "herdr~w1~dead", { agent: "pi", state: "idle" }); // no pid: process gone

    expect(nextNameIndex("recon", "w1")).toBe(1);
    expect(() => assertNameFree("recon-1", "w1")).not.toThrow();
  });

  test("another workspace's fleet never affects numbering", () => {
    const orchDir = tempOrchDir();
    seedLiveAgent(orchDir, "herdr~w2~b1", "recon-1", "w2");

    expect(nextNameIndex("recon", "w1")).toBe(1);
  });

  test("a prefix that is another prefix's head never matches it", () => {
    const orchDir = tempOrchDir();
    seedLiveAgent(orchDir, "herdr~w1~c1", "recon-extra-1", "w1");

    expect(nextNameIndex("recon", "w1")).toBe(1);
    expect(nextNameIndex("recon-extra", "w1")).toBe(2);
  });
});
