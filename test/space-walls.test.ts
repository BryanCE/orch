import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entitySpace, scopeEntitiesToSpace, spaceOf, type Entity } from "../src/entities.ts";
import { checkWall } from "../src/policy/space.ts";
import { recordSpawned } from "../src/presence/store.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const orchDir = mkdtempSync(join(tmpdir(), "orch-space-walls-"));
process.env.ORCH_DIR = orchDir;

// Identity is a minted id and NOTHING else, so a key carries no space: the wall
// reads the space from the environment satellite the agent was placed in, and
// an agent that MOVES space is the same agent with a new open interval.
const AGENTS = {
  w6first: { id: "w6aaaaaaa1", plexer: "herdr", space: "w6" },
  w12first: { id: "w12aaaaaa1", plexer: "herdr", space: "w12" },
  w1herdr: { id: "w1herdraa1", plexer: "herdr", space: "w1" },
  w1herdrB: { id: "w1herdraa2", plexer: "herdr", space: "w1" },
  w2herdr: { id: "w2herdraa1", plexer: "herdr", space: "w2" },
  w1tmux: { id: "w1tmuxaaa1", plexer: "tmux", space: "w1" },
  w2tmux: { id: "w2tmuxaaa1", plexer: "tmux", space: "w2" },
  w1headless: { id: "w1headles1", plexer: "headless", space: "w1" },
  w2headless: { id: "w2headles1", plexer: "headless", space: "w2" },
} as const;

// A space is user-created and never minted from a spawn (TASKS A7), so the
// fixture creates every space it places an agent in — including "w7", which
// only the move test names.
for (const id of ["w1", "w2", "w6", "w7", "w12"]) seedSpace(orchDir, id);

for (const agent of Object.values(AGENTS)) {
  recordSpawned(agent.id, { adapter: "pi", backend: agent.plexer, space: agent.space });
}

afterAll(() => removeTempDir(orchDir));

function fakeEntity(key: string, paneId: string | null): Entity {
  return { key, paneId, managed: true, space: null, name: null, tabLabel: null, agent: null, focused: false, backendStatus: null, backend: null, presence: null, sessionPath: null, presenceOnly: true };
}

describe("space helpers", () => {
  test("reads space ids from the environment satellite, never from the key", () => {
    expect(spaceOf(orchDir, AGENTS.w6first.id)).toBe("w6");
    expect(spaceOf(orchDir, AGENTS.w12first.id)).toBe("w12");
    expect(spaceOf(orchDir, "session-123")).toBeNull();
    expect(spaceOf(orchDir, null)).toBeNull();
    expect(spaceOf(orchDir, "nocolon")).toBeNull();
  });

  test("an agent that moves space keeps its identity and reports the new space", () => {
    recordSpawned(AGENTS.w6first.id, { space: "w7" });
    expect(spaceOf(orchDir, AGENTS.w6first.id)).toBe("w7");
    recordSpawned(AGENTS.w6first.id, { space: "w6" });
    expect(spaceOf(orchDir, AGENTS.w6first.id)).toBe("w6");
  });

  test("derives an entity space from the store", () => {
    expect(entitySpace(fakeEntity(AGENTS.w6first.id, null))).toBe("w6");
    expect(entitySpace(fakeEntity(AGENTS.w12first.id, null))).toBe("w12");
  });

  test("returns the same entities when all spaces are requested", () => {
    const entities = [fakeEntity(AGENTS.w6first.id, "pane-1")];
    expect(scopeEntitiesToSpace(entities, { all: true })).toBe(entities);
  });
});

describe("space wall writes", () => {
  test("allows a write within the same space", () => {
    expect(checkWall(orchDir, AGENTS.w1herdr.id, AGENTS.w1herdrB.id, { crossSpace: false })).toEqual({ allowed: true });
  });

  test("denies a cross-space write with both spaces in the reason", () => {
    const decision = checkWall(orchDir, AGENTS.w1herdr.id, AGENTS.w2herdr.id, { crossSpace: false });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("w1");
    expect(decision.reason).toContain("w2");
  });

  test("applies the same wall rule whatever plexer the agents sit in", () => {
    const pairs = [
      [AGENTS.w1herdr, AGENTS.w2herdr],
      [AGENTS.w1tmux, AGENTS.w2tmux],
      [AGENTS.w1headless, AGENTS.w2headless],
    ] as const;

    for (const [actor, target] of pairs) {
      expect(checkWall(orchDir, actor.id, target.id, { crossSpace: false })).toMatchObject({ allowed: false });
      expect(checkWall(orchDir, actor.id, target.id, { crossSpace: true })).toEqual({ allowed: true });
    }
  });

  test("allows a cross-space write with an explicit override", () => {
    expect(checkWall(orchDir, AGENTS.w1herdr.id, AGENTS.w2herdr.id, { crossSpace: true })).toEqual({ allowed: true });
  });

  test("allows unplaced targets", () => {
    expect(checkWall(orchDir, AGENTS.w1herdr.id, "legacy-target", { crossSpace: false })).toEqual({ allowed: true });
  });
});
