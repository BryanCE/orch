import { afterEach, describe, expect, test } from "bun:test";
import * as path from "node:path";
import { hostIdentity } from "../src/hosts/identity.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { askReview, closeCouncil, councilAt, insertCouncil, scoreReview } from "../src/store/council-rows.ts";
import { closeCouncilNamed, councilRound, councilScores, councilSteer } from "../src/daemon/server/council.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { testServices } from "./helpers/services.ts";
import { writeProjectSettingsFixture } from "./helpers/settings.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { DaemonState } from "../src/daemon/server/state.ts";

const dirs: OrchDir[] = [];
afterEach(() => {
  closeAllStores();
  while (dirs.length) {
    const dir = dirs.pop();
    if (dir !== undefined) removeTempDir(dir);
  }
});

function seeded(members: string[]): { dir: OrchDir; state: DaemonState; directory: string } {
  const dir = tempOrchDir("orch-council-handlers-");
  dirs.push(dir);
  ensureHarness(dir, "pi", "pi", 1);
  for (const name of ["lead", ...members]) {
    insertAgent(dir, { host: hostIdentity(), id: name, name, spawnedBy: null, harnessId: "pi", cwd: dir, createdAt: 1 });
  }
  const directory = path.join(dir, ".orch", "councils", "plan");
  insertCouncil(dir, { id: "c1", name: "plan", directory, convenedBy: "lead", scale: 10, convenedAt: 1, closedAt: null }, members.map((name) => ({ agentId: name, name })));
  const state = idleDaemonState(testServices({ orchDir: dir, settings: { defaults: { adapter: "pi", backend: "headless" } } }), dir);
  return { dir, state, directory };
}

const ref = (dir: OrchDir) => ({ name: "plan", cwd: dir });

describe("the council handlers", () => {
  test("scores refuses a council that was never convened", () => {
    const { dir, state } = seeded([]);
    expect(() => councilScores(state, { name: "ghost", cwd: dir })).toThrow("no council named ghost was convened here");
  });

  test("scores joins each review with its run", () => {
    const { dir, state, directory } = seeded(["ada", "bea"]);
    askReview(dir, { dispatchId: "d1", councilId: "c1", round: 1, member: "ada", askedAt: 2 });
    askReview(dir, { dispatchId: "d2", councilId: "c1", round: 1, member: "bea", askedAt: 2 });
    scoreReview(dir, "d1", 5, { score: 7 });
    upsertRun(dir, { dispatchId: "d1", agentKey: "ada", state: "done", startedAt: 3, model: "m1", cost: 0.5 });
    expect(councilScores(state, ref(dir))).toEqual({
      name: "plan", directory, scale: 10, rounds: 3, closedAt: null, members: ["ada", "bea"], reviews: [
        { round: 1, member: "ada", score: 7, problem: null, scoredAt: 5, model: "m1", cost: 0.5 },
        { round: 1, member: "bea", score: null, problem: null, scoredAt: null, model: null, cost: null },
      ],
    });
  });

  test("a round waits for the one before it", () => {
    const { dir, state } = seeded(["ada"]);
    askReview(dir, { dispatchId: "d1", councilId: "c1", round: 1, member: "ada", askedAt: 2 });
    return expect(councilRound(state, { ...ref(dir), subject: "go" })).rejects.toThrow("round 1 of council plan is still running. Not finished: ada");
  });

  test("a council that has run its rounds takes no more", () => {
    const { dir, state } = seeded(["ada"]);
    for (const round of [1, 2, 3]) {
      askReview(dir, { dispatchId: `d${round}`, councilId: "c1", round, member: "ada", askedAt: round });
      scoreReview(dir, `d${round}`, round, { score: 7 });
    }
    return expect(councilRound(state, { ...ref(dir), subject: "go" })).rejects.toThrow("council plan has run its 3 rounds. Close it, or raise the council.rounds setting to go on");
  });

  test("a council's round limit is its directory's project setting", () => {
    const { dir, state } = seeded(["ada"]);
    writeProjectSettingsFixture(dir, { council: { rounds: 1 } });
    askReview(dir, { dispatchId: "d1", councilId: "c1", round: 1, member: "ada", askedAt: 1 });
    scoreReview(dir, "d1", 1, { score: 7 });
    return expect(councilRound(state, { ...ref(dir), subject: "go" })).rejects.toThrow("has run its 1 rounds");
  });

  test("a closed council takes no round", () => {
    const { dir, state } = seeded(["ada"]);
    closeCouncil(dir, "c1", 9);
    return expect(councilRound(state, { ...ref(dir), subject: "go" })).rejects.toThrow("council plan is closed");
  });

  test("a council with no member running takes no round", () => {
    const { dir, state } = seeded([]);
    return expect(councilRound(state, { ...ref(dir), subject: "go" })).rejects.toThrow("council plan has no member still running");
  });

  test("a steer with no member still writing the round says where to put it", () => {
    const { dir, state } = seeded(["ada"]);
    askReview(dir, { dispatchId: "d1", councilId: "c1", round: 1, member: "ada", askedAt: 2 });
    scoreReview(dir, "d1", 3, { score: 7 });
    return expect(councilSteer(state, { ...ref(dir), text: "The trust gate is out." })).rejects.toThrow("no member of council plan is still writing round 1. Say it in the text of the next round");
  });

  test("a closed council takes no steer", () => {
    const { dir, state } = seeded(["ada"]);
    closeCouncil(dir, "c1", 5);
    return expect(councilSteer(state, { ...ref(dir), text: "The trust gate is out." })).rejects.toThrow("council plan is closed");
  });

  test("close with no member running closes the council", async () => {
    const { dir, state, directory } = seeded([]);
    expect(await closeCouncilNamed(state, ref(dir))).toEqual({ closed: [] });
    expect(typeof councilAt(dir, directory)?.closedAt).toBe("number");
  });
});
