import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordSpawned } from "../src/presence/store.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { assertNameFree, assertValidAgentName } from "../src/policy/name.ts";
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
function seedLiveAgent(orchDir: string, key: string, name: string, space: string): void {
  recordSpawned(key, { space, handle: key });
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

// TASKS/02-scope.md F4 deleted prefix numbering: names are positional, per-slice
// and unnumbered, so there is no index to compute. What survives is the only
// thing numbering ever protected — a LIVE name cannot be taken twice, and a
// DEAD agent releases its name.
describe("a live name is claimed and a dead one is released", () => {
  test("a live agent holds its name against a second spawn", () => {
    const orchDir = tempOrchDir();
    seedLiveAgent(orchDir, "herdr~w1~a1", "recon", "w1");

    expect(() => assertNameFree("recon", "w1")).toThrow(/already live/);
    expect(() => assertNameFree("recon-two", "w1")).not.toThrow();
  });

  test("a dead agent frees its name", () => {
    const orchDir = tempOrchDir();
    recordSpawned("herdr~w1~dead", { space: "w1", handle: "herdr~w1~dead" });
    registerSpawnedAgent(orchDir, { key: "herdr~w1~dead", harnessId: "pi", backendId: "herdr", pane: true, handle: "herdr~w1~dead", cwd: orchDir, name: "recon", model: "test", spawner: null });
    seedStatus(orchDir, "herdr~w1~dead", { agent: "pi", state: "idle" }); // no pid: process gone

    expect(() => assertNameFree("recon", "w1")).not.toThrow();
  });

  test("another workspace's agent never blocks a name here", () => {
    const orchDir = tempOrchDir();
    seedLiveAgent(orchDir, "herdr~w2~b1", "recon", "w2");

    expect(() => assertNameFree("recon", "w1")).not.toThrow();
  });
});
