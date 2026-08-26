import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runWorkLoop } from "../src/daemon/work-loop.ts";
import type { OrchConfig } from "../src/config.ts";
import { appendEvent } from "../src/store/event-rows.ts";
import { getOrCreateSessionIdentity } from "../src/store/identity-rows.ts";
import { insertOutboxMessage, markOutboxDelivered } from "../src/store/outbox-rows.ts";
import { insertQueueTask } from "../src/store/queue-rows.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";
import { setOwner } from "../src/store/ownership-rows.ts";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { selectRuns, upsertRun, type RunRecord } from "../src/store/run-rows.ts";
import type { TaskRec } from "../src/queue.ts";
import { sweepExpiredRows } from "../src/daemon/retention.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";

const directories: string[] = [];

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-retention-"));
  directories.push(orchDir);
  openStore(orchDir);
  return orchDir;
}

function config(days: Partial<OrchConfig["retention"]> = {}): OrchConfig {
  return {
    retention: { queue_days: 14, events_days: 7, runs_days: 30, outbox_days: 7, identities_days: 7, agent_dirs_days: 7, logs_days: 7, ...days },
    queue: { max_retries: 1 },
  } as OrchConfig;
}

function task(id: string, state: TaskRec["state"], ts: string): TaskRec {
  return { id, text: id, opts: {}, createdAt: ts, updatedAt: ts, state, retries: 0, workspace: "test" };
}

function run(dispatchId: string, startedAt: string): RunRecord {
  return { dispatchId, agentKey: "agent", state: "done", startedAt };
}

const NOW = new Date("2026-02-01T00:00:00.000Z");

afterEach(() => {
  closeAllStores();
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

describe("retention sweep", () => {
  test("uses each table's own window and keeps queued and claimed tasks", () => {
    const orchDir = fixture();
    insertQueueTask(orchDir, task("queue-old", "done", "2026-01-01T00:00:00.000Z"));
    insertQueueTask(orchDir, task("queue-new", "done", "2026-01-25T00:00:00.000Z"));
    insertQueueTask(orchDir, task("queued-old", "queued", "2026-01-01T00:00:00.000Z"));
    insertQueueTask(orchDir, task("claimed-old", "claimed", "2026-01-01T00:00:00.000Z"));
    insertOutboxMessage(orchDir, { id: "out-old", target: "x", payload: {}, createdAt: "2026-01-20T00:00:00.000Z" });
    insertOutboxMessage(orchDir, { id: "out-new", target: "x", payload: {}, createdAt: "2026-01-28T00:00:00.000Z" });
    markOutboxDelivered(orchDir, "out-old");
    markOutboxDelivered(orchDir, "out-new");
    appendEvent(orchDir, "2026-01-20T00:00:00.000Z", { id: "event-old" });
    appendEvent(orchDir, "2026-01-30T00:00:00.000Z", { id: "event-new" });
    upsertRun(orchDir, run("run-old", "2025-12-20T00:00:00.000Z"));
    upsertRun(orchDir, run("run-new", "2026-01-20T00:00:00.000Z"));
    getOrCreateSessionIdentity(orchDir, 1, "2026-01-20T00:00:00.000Z", "old");
    getOrCreateSessionIdentity(orchDir, 2, "2026-01-28T00:00:00.000Z", "new");

    expect(sweepExpiredRows(orchDir, config({ queue_days: 14, events_days: 3, runs_days: 30, outbox_days: 7, identities_days: 7 }), NOW)).toEqual({
      queue: 1, outbox: 1, events: 1, runs: 1, identities: 1, agent_dirs: 0, logs: 0,
    });
    expect(openStore(orchDir).query("SELECT id FROM queue ORDER BY id").all()).toHaveLength(3);
    expect(openStore(orchDir).query("SELECT id FROM outbox ORDER BY id").all()).toHaveLength(1);
    expect(openStore(orchDir).query("SELECT seq FROM events").all()).toHaveLength(1);
    expect(selectRuns(orchDir)).toHaveLength(1);
    expect(openStore(orchDir).query("SELECT ancestor_pid FROM session_identities").all()).toHaveLength(1);
  });

  test("returns zero counts when every row is inside its window", () => {
    const orchDir = fixture();
    insertQueueTask(orchDir, task("queue", "done", "2026-01-31T00:00:00.000Z"));
    expect(sweepExpiredRows(orchDir, config(), NOW)).toEqual({ queue: 0, outbox: 0, events: 0, runs: 0, identities: 0, agent_dirs: 0, logs: 0 });
  });

  test("continues sweeping when one table delete fails", () => {
    const orchDir = fixture();
    appendEvent(orchDir, "2020-01-01T00:00:00.000Z", { old: true });
    upsertRun(orchDir, run("old-run", "2020-01-01T00:00:00.000Z"));
    openStore(orchDir).exec("DROP TABLE queue");

    const counts = sweepExpiredRows(orchDir, config({ events_days: 1, runs_days: 1 }), NOW);
    expect(counts.queue).toBe(0);
    expect(counts.events).toBe(1);
    expect(counts.runs).toBe(1);
  });

  test("reaps only old dead presence dirs through clean's shared path", () => {
    const orchDir = fixture();
    const key = "dead-agent";
    const dir = seedStatus(orchDir, key, { pid: 999999 });
    insertSpawnedRecord(orchDir, { pane: key, ts: NOW.toISOString() });
    setOwner(orchDir, key, "owner");
    const recent = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000);
    utimesSync(dir, recent, recent);
    expect(sweepExpiredRows(orchDir, config({ agent_dirs_days: 7 }), NOW).agent_dirs).toBe(0);
    expect(existsSync(dir)).toBe(true);
    const old = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
    utimesSync(dir, old, old);
    expect(sweepExpiredRows(orchDir, config({ agent_dirs_days: 7 }), NOW).agent_dirs).toBe(1);
    expect(existsSync(dir)).toBe(false);
    expect(openStore(orchDir).query("SELECT pane FROM spawned WHERE pane = ?").all(key)).toHaveLength(0);
    expect(openStore(orchDir).query("SELECT owner FROM ownership WHERE agent_key = ?").all(key)).toHaveLength(0);
  });

  test("never reaps a live presence dir regardless of age", () => {
    const orchDir = fixture();
    const dir = seedStatus(orchDir, "live-agent", { pid: process.pid });
    const old = new Date(NOW.getTime() - 100 * 24 * 60 * 60 * 1000);
    utimesSync(dir, old, old);
    expect(sweepExpiredRows(orchDir, config({ agent_dirs_days: 1 }), NOW).agent_dirs).toBe(0);
    expect(existsSync(dir)).toBe(true);
  });

  test("sweeps old logs but preserves logs for live agents", () => {
    const orchDir = fixture();
    const logs = join(orchDir, "logs");
    mkdirSync(logs);
    const deadLog = join(logs, "dead-agent.log");
    const liveLog = join(logs, "live-agent.log");
    writeFileSync(deadLog, "dead");
    writeFileSync(liveLog, "live");
    seedStatus(orchDir, "live-agent", { pid: process.pid });
    const old = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
    utimesSync(deadLog, old, old);
    utimesSync(liveLog, old, old);
    expect(sweepExpiredRows(orchDir, config({ logs_days: 7 }), NOW).logs).toBe(1);
    expect(existsSync(deadLog)).toBe(false);
    expect(existsSync(liveLog)).toBe(true);
  });

  test("does not sweep again one minute after the first tick", async () => {
    const orchDir = fixture();
    const controller = new AbortController();
    const originalNow = Date.now;
    const firstTick = NOW.getTime();
    let ticks = 0;
    try {
      Date.now = () => (ticks < 2 ? firstTick : firstTick + 60_000);
      const settings = config({ runs_days: 1 });
      const loop = runWorkLoop({
        orchDir,
        pollIntervalMs: 1,
        continuous: true,
        signal: controller.signal,
        getConfig: () => {
          ticks += 1;
          if (ticks === 2) upsertRun(orchDir, run("inserted-after-sweep", "2020-01-01T00:00:00.000Z"));
          if (ticks === 3) controller.abort();
          return settings;
        },
      });
      await loop;
    } finally {
      Date.now = originalNow;
    }
    expect(selectRuns(orchDir)).toHaveLength(1);
  });
});
