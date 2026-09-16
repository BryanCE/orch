import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { assertNameFree, assertValidAgentName } from "../src/policy/name.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { endProcess, setSpace } from "../src/store/interval-rows.ts";
import { runnerProcess } from "./helpers/agent.ts";
import { loadPresence, spawnedRecords } from "../src/presence/store.ts";
import { indexPresenceById } from "../src/entities/lookup.ts";

import type { OrchDir } from "../src/types/core.ts";
const directories: OrchDir[] = [];
let previousOrchDir: string | undefined;

function makeTempOrchDir(): OrchDir {
  const directory = tempOrchDir("orch-spawn-names-");
  directories.push(directory);
  process.env.ORCH_DIR = directory;
  return directory;
}

/** Register one agent. The key IS the minted id (A1) — the space it sits in is a
 *  separate fact written through the environment satellites, never a segment of
 *  the key. */
function seedAgent(orchDir: OrchDir, name: string, space: string): string {
  const key = mintAgentId();
  seedSpace(orchDir, space);
  registerSpawnedAgent(orchDir, { key, harnessId: "pi", backendId: "herdr", placed: true, handle: `%${key}`, cwd: orchDir, name, model: "test", space, spawner: null, process: runnerProcess() });
  return key;
}

/** A live named agent: a registered agent, whose recorded process is this runner, plus its status. */
function seedLiveAgent(orchDir: OrchDir, name: string, space: string): string {
  const key = seedAgent(orchDir, name, space);
  seedStatus(orchDir, key, { agent: "pi", state: "idle" });
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

// Deleted prefix numbering: names are positional, per-slice
// and unnumbered, so there is no index to compute. What survives is the only
// thing numbering ever protected — a LIVE name cannot be taken twice, and a
// DEAD agent releases its name.
describe("a live name is claimed and a dead one is released", () => {
  test("a live agent holds its name against a second spawn", () => {
    const orchDir = makeTempOrchDir();
    seedLiveAgent(orchDir, "recon", "w1");
    const views = spawnedRecords(orchDir);
    const presence = indexPresenceById(loadPresence(orchDir).values());

    expect(() => assertNameFree(views, presence, "recon", "w1")).toThrow(/already live/);
    expect(() => assertNameFree(views, presence, "recon-two", "w1")).not.toThrow();
  });

  test("a dead agent frees its name", () => {
    const orchDir = makeTempOrchDir();
    const key = seedAgent(orchDir, "recon", "w1");
    seedStatus(orchDir, key, { agent: "pi", state: "idle" });
    endProcess(orchDir, key, Date.now()); // the recorded process is gone
    const views = spawnedRecords(orchDir);
    const presence = indexPresenceById(loadPresence(orchDir).values());

    expect(() => assertNameFree(views, presence, "recon", "w1")).not.toThrow();
  });

  test("another space's agent never blocks a name here", () => {
    const orchDir = makeTempOrchDir();
    seedLiveAgent(orchDir, "recon", "w2");
    const views = spawnedRecords(orchDir);
    const presence = indexPresenceById(loadPresence(orchDir).values());

    expect(() => assertNameFree(views, presence, "recon", "w1")).not.toThrow();
  });
});

// A1 / Rule 11: uniqueness is scoped by the agent's CURRENT space, composed from
// `agent_spaces`. Scoping it by a space sliced out of the identity key made a
// moved agent go on holding its name in the space it was BORN in, and leave the
// space it actually occupies open to a duplicate.
describe("name scope follows the agent's current space, not its birthplace", () => {
  test("moving an agent moves the name it holds", () => {
    const orchDir = makeTempOrchDir();
    const key = seedLiveAgent(orchDir, "recon", "w1");
    let views = spawnedRecords(orchDir);
    let presence = indexPresenceById(loadPresence(orchDir).values());

    expect(() => assertNameFree(views, presence, "recon", "w1")).toThrow(/already live/);
    expect(() => assertNameFree(views, presence, "recon", "w2")).not.toThrow();

    // The agent moves. Its identity is untouched — only the environment changed.
    seedSpace(orchDir, "w2");
    // A move is a new interval on the space axis, not a re-registration.
    setSpace(orchDir, key, Date.now(), "w2");
    views = spawnedRecords(orchDir);
    presence = indexPresenceById(loadPresence(orchDir).values());

    expect(() => assertNameFree(views, presence, "recon", "w1")).not.toThrow();
    expect(() => assertNameFree(views, presence, "recon", "w2")).toThrow(/already live/);
  });

  test("the collision names the agent by its minted id", () => {
    const orchDir = makeTempOrchDir();
    const key = seedLiveAgent(orchDir, "recon", "w1");
    const views = spawnedRecords(orchDir);
    const presence = indexPresenceById(loadPresence(orchDir).values());

    expect(() => assertNameFree(views, presence, "recon", "w1")).toThrow(new RegExp(`already live as ${key}`));
  });
});
