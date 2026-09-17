import { recordingLogger } from "./helpers/logger.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { runWorkLoop, statusSpeaksForTask } from "../src/daemon/server/work-loop.ts";
import { createWakeSignal } from "../src/daemon/server/wake.ts";
import { addTask, type TaskRec } from "../src/queue.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedLiveProcess } from "./helpers/agent.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { NotifyEvent } from "../src/types/notify.ts";
import { sql } from "drizzle-orm";
import { testServices } from "./helpers/services.ts";
import type { OrchDir } from "../src/types/core.ts";
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

const directories: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (directories.length) removeTempDir(directories.pop()!); });

/** A1: the presence key IS the minted id the runner's attempts and events carry
 *  — the plexer and the space are environment, never segments of an address. */
const RUNNER_KEY = "runner0000";

/** An enqueuer and one runner in its pack, with the runner idle on disk. */
function fleet(): OrchDir {
  const dir = tempOrchDir("orch-work-loop-enqueuer-");
  directories.push(dir);
  const db = orm(dir);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
  db.run(sql`INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES ('enq',NULL,'enq','pi','/repo','enq',1)`);
  db.run(sql`INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES ('runner0000','enq','enq','pi','/repo','runner',1)`);
  seedLiveProcess(dir, "runner0000");
  seedStatus(dir, RUNNER_KEY, { state: "idle", label: "Runner" });
  writeSettingsFixture(dir);
  return dir;
}

describe("Cq4: results go to the enqueuer, not the runner", () => {
  test("continuous work passes record tick timing", async () => {
    const dir = fleet();
    const controller = new AbortController();
    const wake = createWakeSignal();
    let waited = false;
    const controlledWake = {
      wake: (): void => wake.wake(),
      next: (timeoutMs: number, signal?: AbortSignal): Promise<void> => {
        if (!waited) {
          waited = true;
          controller.abort();
        }
        return wake.next(timeoutMs, signal);
      },
    };
    const { logger, records } = recordingLogger();
    const services = testServices({ orchDir: dir, settings: {} });
    await runWorkLoop({
      logger,
      orchDir: dir,
      wake: controlledWake,
      tickMs: 1_000,
      signal: controller.signal,
      continuous: true,
      json: true,
      settings: services.settings,
      models: services.models,
    });
    const ticks = records.filter((record) => record.event === "tick.work");
    expect(ticks).toHaveLength(1);
    expect(typeof ticks[0]?.fields?.elapsedMs).toBe("number");
  });

  test("every task event the work loop publishes is keyed to whoever enqueued it", async () => {
    const dir = fleet();
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = dir;
    const published: NotifyEvent[] = [];
    try {
      const task = addTask(dir, "cross-pack result", {}, "enq");
      await runWorkLoop({
    logger: testLogger,
        orchDir: dir,
        wake: createWakeSignal(),
        tickMs: 10,
        once: true,
        json: true,
        settings: testServices({ orchDir: dir, settings: {} }).settings,
        models: testServices({ orchDir: dir }).models,
        dispatch: () => {
          seedStatus(dir, RUNNER_KEY, { state: "done", label: "Runner" });
          return Promise.resolve();
        },
        onEvent: (event) => published.push(event),
      });
      expect(published.map((event) => event.type === "task" ? event.newState : undefined)).toEqual(["claimed", "done"]);
      // The runner ran it; the enqueuer is who hears about it.
      expect(published.map((event) => event.key)).toEqual(["enq", "enq"]);
      expect(published.map((event) => event.type === "task" ? event.task : undefined)).toEqual([task.text, task.text]);
    } finally {
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
  }, 20_000);
});

const { logger: testLogger } = recordingLogger();
