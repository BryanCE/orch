import { afterEach, describe, expect, test } from "bun:test";
import { hostIdentity } from "../src/hosts/identity.ts";
import { agentHosts, agents, harnesses } from "../src/db/schema.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
import { askReview, closeCouncil, councilAt, councilMembersOf, councilReviewsOf, insertCouncil, lastRound, scoreReview, waitingReview } from "../src/store/council-rows.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { CouncilRecord } from "../src/types/council.ts";

const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-council-");
  dirs.push(dir);
  const db = orm(dir);
  db.insert(harnesses).values({ id: "pi", name: "pi", enabledAt: null }).run();
  const host = hostIdentity();
  ensureHost(dir, host, 0);
  for (const id of ["lead", "ada", "bea"]) {
    db.insert(agents).values({ id, spawnedBy: null, rootAgentId: id, harnessId: "pi", name: id, label: null, kind: "session", createdAt: 0 }).run();
    db.insert(agentHosts).values({ agentId: id, since: 0, until: null, hostId: host.id, cwd: "/" }).run();
  }
  return dir;
}

const council: CouncilRecord = { id: "c1", name: "plan", directory: "/repo/.orch/councils/plan", convenedBy: "lead", scale: 10, convenedAt: 1, closedAt: null };
const ask = (dispatchId: string, member: string, round: number) => ({ dispatchId, councilId: "c1", round, member, askedAt: 2 });

describe("council rows", () => {
  test("stores a council and its members", () => {
    const dir = fixture();
    insertCouncil(dir, council, [{ agentId: "bea", name: "second" }, { agentId: "ada", name: "first" }]);
    expect(councilAt(dir, council.directory)).toEqual(council);
    expect(councilAt(dir, "/other")).toBeUndefined();
    expect(councilMembersOf(dir, "c1")).toEqual([{ agentId: "ada", name: "first" }, { agentId: "bea", name: "second" }]);
  });

  test("refuses a second council in the same directory", () => {
    const dir = fixture();
    insertCouncil(dir, council, []);
    expect(() => insertCouncil(dir, { ...council, id: "c2" }, [])).toThrow();
  });

  test("a missing member leaves no council behind", () => {
    const dir = fixture();
    expect(() => insertCouncil(dir, council, [{ agentId: "ghost", name: "ghost" }])).toThrow();
    expect(councilAt(dir, council.directory)).toBeUndefined();
  });

  test("tracks the newest review round", () => {
    const dir = fixture();
    insertCouncil(dir, council, []);
    expect(lastRound(dir, "c1")).toBe(0);
    askReview(dir, ask("d1", "ada", 1));
    askReview(dir, ask("d2", "ada", 2));
    expect(lastRound(dir, "c1")).toBe(2);
  });

  test("returns a waiting review with its council", () => {
    const dir = fixture();
    insertCouncil(dir, council, []);
    askReview(dir, ask("d1", "ada", 1));
    expect(waitingReview(dir, "d1")).toEqual({ review: { ...ask("d1", "ada", 1), score: null, problem: null, scoredAt: null }, council });
    expect(waitingReview(dir, "nope")).toBeUndefined();
  });

  test("settles a score once", () => {
    const dir = fixture();
    insertCouncil(dir, council, []);
    askReview(dir, ask("d1", "ada", 1));
    scoreReview(dir, "d1", 9, { score: 7 });
    const reviews = [{ ...ask("d1", "ada", 1), score: 7, problem: null, scoredAt: 9 }];
    expect(councilReviewsOf(dir, "c1")).toEqual(reviews);
    expect(waitingReview(dir, "d1")).toBeUndefined();
    scoreReview(dir, "d1", 10, { problem: "x" });
    expect(councilReviewsOf(dir, "c1")).toEqual(reviews);
  });

  test("settles a problem without a score", () => {
    const dir = fixture();
    insertCouncil(dir, council, []);
    askReview(dir, ask("d1", "ada", 1));
    scoreReview(dir, "d1", 9, { problem: "the file has no Score line" });
    expect(councilReviewsOf(dir, "c1")).toEqual([{ ...ask("d1", "ada", 1), score: null, problem: "the file has no Score line", scoredAt: 9 }]);
  });

  test("allows one review per member per round", () => {
    const dir = fixture();
    insertCouncil(dir, council, []);
    askReview(dir, ask("d1", "ada", 1));
    expect(() => askReview(dir, ask("d9", "ada", 1))).toThrow();
  });

  test("orders reviews by round then member", () => {
    const dir = fixture();
    insertCouncil(dir, council, []);
    askReview(dir, ask("d1", "bea", 1));
    askReview(dir, ask("d2", "ada", 2));
    askReview(dir, ask("d3", "ada", 1));
    expect(councilReviewsOf(dir, "c1").map((review) => review.dispatchId)).toEqual(["d3", "d1", "d2"]);
  });

  test("closes a council once", () => {
    const dir = fixture();
    insertCouncil(dir, council, []);
    closeCouncil(dir, "c1", 5);
    closeCouncil(dir, "c1", 8);
    expect(councilAt(dir, council.directory)?.closedAt).toBe(5);
  });
});
