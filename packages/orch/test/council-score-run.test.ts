import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { hostIdentity } from "../src/hosts/identity.ts";
import { agentHosts, agents, harnesses } from "../src/db/schema.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
import { askReview, councilReviewsOf, insertCouncil } from "../src/store/council-rows.ts";
import { scoreFinishedRun } from "../src/daemon/server/council.ts";
import { flushPresenceHistory } from "../src/presence/history.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { RunRecord } from "../src/types/store.ts";

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

/** A council under the temp dir with ada on it, round 1 asked for by dispatch d1. `file` is what ada wrote, or null for no file. Returns the orch dir and the round file's path. */
function asked(file: string | null): { dir: OrchDir; roundFile: string } {
  const dir = fixture();
  const directory = path.join(dir, "councils", "plan");
  insertCouncil(dir, { id: "c1", name: "plan", directory, convenedBy: "lead", scale: 10, convenedAt: 1, closedAt: null }, [{ agentId: "ada", name: "ada" }]);
  askReview(dir, { dispatchId: "d1", councilId: "c1", round: 1, member: "ada", askedAt: 2 });
  const roundFile = path.join(directory, "ada", "round-1.md");
  if (file !== null) {
    fs.mkdirSync(path.dirname(roundFile), { recursive: true });
    fs.writeFileSync(roundFile, file);
  }
  return { dir, roundFile };
}

const done: RunRecord = { dispatchId: "d1", agentKey: "ada", state: "done", startedAt: 3 };
const good = "Score: 7/10\n\n## Improvements\n\n1. Tighten the intro.\n";
const only = (dir: OrchDir) => councilReviewsOf(dir, "c1")[0];

describe("scoring a finished council run", () => {
  test("stores the score in its file", () => {
    const { dir } = asked(good);
    scoreFinishedRun(dir, done, 9);
    expect(only(dir)).toMatchObject({ score: 7, problem: null, scoredAt: 9 });
  });

  test("records a member that wrote no file", () => {
    const { dir, roundFile } = asked(null);
    scoreFinishedRun(dir, done, 9);
    expect(only(dir)).toMatchObject({ score: null, problem: `the member wrote no ${roundFile}`, scoredAt: 9 });
  });

  test("records a file with no score line", () => {
    const { dir } = asked("no score here");
    scoreFinishedRun(dir, done, 9);
    expect(only(dir)?.problem).toBe("the file has no `Score: <n>/10` line");
  });

  test("leaves a run still going waiting", () => {
    const { dir } = asked(good);
    scoreFinishedRun(dir, { ...done, state: "working" }, 9);
    expect(only(dir)?.scoredAt).toBeNull();
  });

  test("records a run that ended another way", () => {
    const { dir } = asked(good);
    scoreFinishedRun(dir, { ...done, state: "error", finishedAt: 5 }, 9);
    expect(only(dir)).toMatchObject({ score: null, problem: "the member's run ended error" });
  });

  test("ignores a run that is no council round", () => {
    const { dir } = asked(good);
    scoreFinishedRun(dir, { ...done, dispatchId: "other" }, 9);
    expect(only(dir)?.scoredAt).toBeNull();
  });

  test("scores a review once", () => {
    const { dir, roundFile } = asked(good);
    scoreFinishedRun(dir, done, 9);
    fs.writeFileSync(roundFile, "Score: 9/10\n\n## Improvements\n");
    scoreFinishedRun(dir, done, 12);
    expect(only(dir)).toMatchObject({ score: 7, scoredAt: 9 });
  });

  test("writes the score to the member's history", () => {
    const { dir } = asked(good);
    scoreFinishedRun(dir, done, 9);
    flushPresenceHistory();
    const line = fs.readFileSync(path.join(dir, "agents", "ada", "scores.jsonl"), "utf8").trim();
    const parsed: unknown = JSON.parse(line);
    expect(parsed).toEqual({ ts: 9, key: "ada", dispatchId: "d1", council: "plan", round: 1, member: "ada", score: 7 });
  });
});
