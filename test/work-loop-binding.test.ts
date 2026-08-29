import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serializeIdentity } from "../src/backends/identity.ts";
import { runWorkLoop, statusSpeaksForTask } from "../src/daemon/work-loop.ts";
import { addTask, type TaskRec } from "../src/queue.ts";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import type { NotifyEvent } from "../src/notify/format.ts";
import { seedStatus } from "./helpers/presence.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

function claimedTask(): TaskRec {
  return {
    id: "t1", text: "x", opts: {}, enqueuedBy: "orch", scopeAgentId: null,
    scopePackId: "orch", scopeSpaceId: null, createdAt: "", updatedAt: "",
    state: "claimed", stale: false, attempts: [{ since: 1, until: null, agentId: "worker0001", dispatchId: "mine", outcome: null, result: null, error: null }],
  };
}

describe("work loop attempt binding", () => {
  test("statusSpeaksForTask verifies the current attempt dispatch id", () => {
    const task = claimedTask();
    expect(statusSpeaksForTask(null, task)).toBe(false);
    expect(statusSpeaksForTask({}, task)).toBe(true);
    expect(statusSpeaksForTask({ dispatchId: "mine" }, task)).toBe(true);
    expect(statusSpeaksForTask({ dispatchId: "other" }, task)).toBe(false);
  });
});

const directories: string[] = [];
afterEach(() => { closeAllStores(); while (directories.length) removeTempDir(directories.pop()!); });

/** A1: the presence key IS the minted id the runner's attempts and events carry
 *  — the plexer and the space are environment, never segments of an address. */
const RUNNER_KEY = serializeIdentity({ id: "runner0000" });

/** An enqueuer and one runner in its pack, with the runner idle on disk. */
function fleet(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-work-loop-enqueuer-"));
  directories.push(dir);
  const db = openStore(dir);
  db.query("INSERT INTO harnesses(id,name) VALUES ('pi','Pi')").run();
  db.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES ('enq',NULL,'enq','pi','/repo','enq',1)").run();
  db.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES ('runner0000','enq','enq','pi','/repo','runner',1)").run();
  seedStatus(dir, RUNNER_KEY, { state: "idle", label: "Runner", pid: process.pid });
  writeSettingsFixture(dir);
  return dir;
}

describe("Cq4: results go to the enqueuer, not the runner", () => {
  test("every task event the work loop publishes is keyed to whoever enqueued it", async () => {
    const dir = fleet();
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = dir;
    const published: NotifyEvent[] = [];
    try {
      const task = addTask(dir, "cross-pack result", {}, "enq");
      await runWorkLoop({
        orchDir: dir,
        pollIntervalMs: 10,
        once: true,
        json: true,
        dispatch: () => {
          seedStatus(dir, RUNNER_KEY, { state: "done", label: "Runner", pid: process.pid });
          return Promise.resolve();
        },
        onEvent: (event) => published.push(event),
      });
      expect(published.map((event) => event.newState)).toEqual(["claimed", "done"]);
      // The runner ran it; the enqueuer is who hears about it.
      expect(published.map((event) => event.key)).toEqual(["enq", "enq"]);
      expect(published.map((event) => event.task)).toEqual([task.text, task.text]);
    } finally {
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
  }, 20_000);
});
