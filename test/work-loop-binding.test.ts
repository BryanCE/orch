import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, claimTask, listTasks, unclaimTask, type TaskRec } from "../src/queue.ts";
import { runWorkLoop, statusSpeaksForTask } from "../src/daemon/work-loop.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";

const directories: string[] = [];
let previousOrchDir: string | undefined;

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-work-loop-binding-"));
  directories.push(directory);
  process.env.ORCH_DIR = directory;
  return directory;
}

beforeEach(() => {
  previousOrchDir = process.env.ORCH_DIR;
});

afterEach(() => {
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

async function settleOnce(orchDir: string): Promise<void> {
  await runWorkLoop({ orchDir, pollIntervalMs: 1, once: true, json: true, onEvent: () => { /* captured nowhere */ } });
}

describe("work loop dispatch binding", () => {
  test("statusSpeaksForTask demands an id match whenever the bridge reports one", () => {
    const task: TaskRec = { id: "t1", text: "x", opts: {}, createdAt: "", updatedAt: "", state: "claimed", retries: 0, dispatchId: "mine" };
    expect(statusSpeaksForTask(null, task)).toBe(false);
    expect(statusSpeaksForTask({}, task)).toBe(true); // hook bridges report none
    expect(statusSpeaksForTask({ dispatchId: "mine" }, task)).toBe(true);
    expect(statusSpeaksForTask({ dispatchId: "other" }, task)).toBe(false);
  });

  test("a claimed task settles only from a status carrying its own dispatch id", async () => {
    const orchDir = tempOrchDir();
    const key = "headless~w1~binding-agent";
    const task = addTask(orchDir, "trace me", {}, "w1");
    expect(claimTask(orchDir, task.id, key, "dispatch-mine")).toBe(true);

    // The agent finished ANOTHER prompt (an orchestrator's own dispatch): the
    // done state must not settle this task — that is the crossed-wires bug.
    seedStatus(orchDir, key, { agent: "pi", pid: process.pid, state: "done", dispatchId: "dispatch-other" });
    await settleOnce(orchDir);
    expect(listTasks(orchDir)[0]).toMatchObject({ state: "claimed" });

    seedStatus(orchDir, key, { agent: "pi", pid: process.pid, state: "done", dispatchId: "dispatch-mine" });
    await settleOnce(orchDir);
    expect(listTasks(orchDir)[0]).toMatchObject({ state: "done" });
  });

  test("a claimed task whose agent died fails instead of re-binding to a new pane", async () => {
    const orchDir = tempOrchDir();
    const key = "headless~w1~dead-agent";
    const task = addTask(orchDir, "stranded", {}, "w1");
    expect(claimTask(orchDir, task.id, key, "dispatch-1")).toBe(true);
    seedStatus(orchDir, key, { agent: "pi", state: "working" }); // no pid: the process is gone

    await settleOnce(orchDir);
    expect(listTasks(orchDir)[0]).toMatchObject({ state: "failed", lastError: expect.stringContaining("never re-binds") as unknown as string });
  });

  test("a bound retry whose agent died fails too, never reaching another agent", async () => {
    const orchDir = tempOrchDir();
    const key = "headless~w1~gone-agent";
    const task = addTask(orchDir, "orphaned retry", {}, "w1");
    expect(claimTask(orchDir, task.id, key, "dispatch-1")).toBe(true);
    unclaimTask(orchDir, task.id); // requeued for retry, binding kept
    seedStatus(orchDir, key, { agent: "pi", state: "working" }); // no pid: the process is gone

    await settleOnce(orchDir);
    expect(listTasks(orchDir)[0]).toMatchObject({ state: "failed", lastError: expect.stringContaining("never re-binds") as unknown as string });
  });
});
