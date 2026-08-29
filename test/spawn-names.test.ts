import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mintAgentId } from "../src/backends/identity.ts";
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

/** Register one agent. The key IS the minted id (A1) — the space it sits in is a
 *  separate fact written through the environment satellites, never a segment of
 *  the key. */
function seedAgent(orchDir: string, name: string, space: string): string {
  const key = mintAgentId();
  registerSpawnedAgent(orchDir, { key, harnessId: "pi", backendId: "herdr", pane: true, handle: `%${key}`, cwd: orchDir, name, model: "test", spawner: null });
  recordSpawned(key, { adapter: "pi", space });
  return key;
}

/** A live named agent: a registered agent plus a presence status naming this pid. */
function seedLiveAgent(orchDir: string, name: string, space: string): string {
  const key = seedAgent(orchDir, name, space);
  seedStatus(orchDir, key, { agent: "pi", pid: process.pid, state: "idle" });
  return key;
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
    seedLiveAgent(orchDir, "recon", "w1");

    expect(() => assertNameFree("recon", "w1")).toThrow(/already live/);
    expect(() => assertNameFree("recon-two", "w1")).not.toThrow();
  });

  test("a dead agent frees its name", () => {
    const orchDir = tempOrchDir();
    const key = seedAgent(orchDir, "recon", "w1");
    seedStatus(orchDir, key, { agent: "pi", state: "idle" }); // no pid: process gone

    expect(() => assertNameFree("recon", "w1")).not.toThrow();
  });

  test("another space's agent never blocks a name here", () => {
    const orchDir = tempOrchDir();
    seedLiveAgent(orchDir, "recon", "w2");

    expect(() => assertNameFree("recon", "w1")).not.toThrow();
  });
});

// A1 / Rule 11: uniqueness is scoped by the agent's CURRENT space, composed from
// `agent_spaces`. Scoping it by a space sliced out of the identity key made a
// moved agent go on holding its name in the space it was BORN in, and leave the
// space it actually occupies open to a duplicate.
describe("name scope follows the agent's current space, not its birthplace", () => {
  test("moving an agent moves the name it holds", () => {
    const orchDir = tempOrchDir();
    const key = seedLiveAgent(orchDir, "recon", "w1");

    expect(() => assertNameFree("recon", "w1")).toThrow(/already live/);
    expect(() => assertNameFree("recon", "w2")).not.toThrow();

    // The agent moves. Its identity is untouched — only the environment changed.
    recordSpawned(key, { adapter: "pi", space: "w2" });

    expect(() => assertNameFree("recon", "w1")).not.toThrow();
    expect(() => assertNameFree("recon", "w2")).toThrow(/already live/);
  });

  test("the collision names the agent by its minted id", () => {
    const orchDir = tempOrchDir();
    const key = seedLiveAgent(orchDir, "recon", "w1");

    expect(() => assertNameFree("recon", "w1")).toThrow(new RegExp(`already live as ${key}`));
  });
});
