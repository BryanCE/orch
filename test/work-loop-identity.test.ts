import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serializeIdentity } from "../src/backends/identity.ts";
import { runWorkLoop } from "../src/daemon/work-loop.ts";
import { addTask, listTasks } from "../src/queue.ts";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { attemptsOf } from "../src/store/task-rows.ts";
import { seedStatus } from "./helpers/presence.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { NotifyEvent } from "../src/types/notify.ts";

const directories: string[] = [];
afterEach(() => { closeAllStores(); while (directories.length) removeTempDir(directories.pop()!); });

/** A1: the runner's presence key IS its minted id. The plexer and the space it
 *  sits in are environment, composed from `agent_plexers`/`agent_spaces`, and
 *  there is no longer anywhere in a key to weld them. */
const RUNNER_KEY = serializeIdentity({ id: "runner0000" });

function fleet(): { dir: string; runnerKey: string } {
  const dir = mkdtempSync(join(tmpdir(), "orch-work-loop-identity-"));
  directories.push(dir);
  const db = openStore(dir);
  db.query("INSERT INTO harnesses(id,name) VALUES ('pi','Pi')").run();
  db.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES ('enq',NULL,'enq','pi','/repo','enq',1)").run();
  db.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES ('runner0000','enq','enq','pi','/repo','runner',1)").run();
  seedStatus(dir, RUNNER_KEY, { state: "idle", label: "Runner", pid: process.pid });
  writeSettingsFixture(dir);
  return { dir, runnerKey: RUNNER_KEY };
}

async function withOrchDir<T>(dir: string, body: () => Promise<T>): Promise<T> {
  const previous = process.env.ORCH_DIR;
  process.env.ORCH_DIR = dir;
  try { return await body(); } finally {
    if (previous === undefined) delete process.env.ORCH_DIR;
    else process.env.ORCH_DIR = previous;
  }
}

describe("Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key", () => {
  test("a claim records the minted agent id, not the presence key", async () => {
    const { dir } = fleet();
    await withOrchDir(dir, async () => {
      const task = addTask(dir, "pack work", {}, "enq");
      await runWorkLoop({
        orchDir: dir,
        pollIntervalMs: 10,
        once: true,
        json: true,
        dispatch: () => {
          seedStatus(dir, RUNNER_KEY, { state: "done", label: "Runner", pid: process.pid });
          return Promise.resolve();
        },
        onEvent: () => { /* events are Cq4's business */ },
      });
      expect(attemptsOf(dir, task.id).map((attempt) => attempt.agentId)).toEqual(["runner0000"]);
      expect(listTasks(dir)[0]?.state).toBe("done");
    });
  }, 20_000);

  test("an idle process with no registered agent row is never handed pack work", async () => {
    const { dir } = fleet();
    const stranger = serializeIdentity({ id: "stranger00" });
    seedStatus(dir, stranger, { state: "idle", label: "Stranger", pid: process.pid });
    openStore(dir).query("INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES ('runner0000',2,NULL)").run();
    await withOrchDir(dir, async () => {
      const task = addTask(dir, "pack work", {}, "enq");
      const events: NotifyEvent[] = [];
      await runWorkLoop({
        orchDir: dir, pollIntervalMs: 10, once: true, json: true,
        dispatch: () => Promise.resolve(),
        onEvent: (event) => events.push(event),
      });
      expect(attemptsOf(dir, task.id)).toEqual([]);
      expect(events).toEqual([]);
    });
  }, 20_000);

  test("Cq1: the pack drains its own queue with its orch dead and no lease in force", async () => {
    const { dir } = fleet();
    openStore(dir).query("INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES ('enq',2,NULL)").run();
    await withOrchDir(dir, async () => {
      const task = addTask(dir, "survives its orch", {}, "runner0000");
      expect(openStore(dir).query("SELECT agent_id FROM agent_leases WHERE until IS NULL").all()).toEqual([]);
      await runWorkLoop({
        orchDir: dir, pollIntervalMs: 10, once: true, json: true,
        dispatch: () => {
          seedStatus(dir, RUNNER_KEY, { state: "done", label: "Runner", pid: process.pid });
          return Promise.resolve();
        },
        onEvent: () => { /* Cq4 covers where these land */ },
      });
      expect(attemptsOf(dir, task.id).map((attempt) => attempt.agentId)).toEqual(["runner0000"]);
      expect(listTasks(dir)[0]?.state).toBe("done");
    });
  }, 20_000);
});
