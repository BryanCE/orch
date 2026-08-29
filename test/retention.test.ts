import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runWorkLoop } from "../src/daemon/work-loop.ts";
import { loadConfigOrNull, SETTINGS_SCHEMA } from "../src/config.ts";
import { appendEvent } from "../src/store/event-rows.ts";
import { insertOutboxMessage, markOutboxDelivered } from "../src/store/outbox-rows.ts";
import { addTask, claimTask, recordTaskDone } from "../src/queue.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { selectRuns, upsertRun } from "../src/store/run-rows.ts";
import { ORCH_LOG_MAX_BYTES, sweepExpiredRows } from "../src/daemon/retention.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";
import { writeResult } from "../src/presence/writer.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import type { RunRecord } from "../src/types/store.ts";
import type { OrchConfig } from "../src/types/config.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
const directories: string[] = [];

function fixture(): string {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-retention-"));
  directories.push(orchDir);
  orm(orchDir);
  return orchDir;
}

function config(days: Partial<OrchConfig["retention"]> = {}): OrchConfig {
  return {
    retention: { ended_agents_days: 90, queue_days: 14, events_days: 7, runs_days: 30, outbox_days: 7, logs_days: 7, ...days },
    queue: { max_retries: 1 },
  } as OrchConfig;
}

function seedQueueTask(dir: string, text: string, state: "queued" | "claimed" | "done", ts: string): void {
  const db = orm(dir);
  db.run(sql`INSERT OR IGNORE INTO harnesses(id,name) VALUES ('pi','Pi')`);
  db.run(sql`INSERT OR IGNORE INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('queue-agent','queue-agent','pi','/tmp','queue-agent',1)`);
  const task = addTask(dir, text, {}, "queue-agent");
  db.run(sql`UPDATE tasks SET created_at=${Date.parse(ts)} WHERE id=${task.id}`);
  if (state !== "queued") {
    claimTask(dir, task.id, "queue-agent", `${text}-dispatch`);
    if (state === "done") {
      recordTaskDone(dir, task.id);
      const until = Date.parse(ts);
      db.run(sql`UPDATE task_attempts SET since=${until - 1}, until=${until} WHERE task_id=${task.id}`);
    }
  }
}

function run(dispatchId: string, startedAt: string): RunRecord {
  return { dispatchId, agentKey: "agent", state: "done", startedAt: Date.parse(startedAt) };
}

const NOW = new Date("2026-02-01T00:00:00.000Z");

afterEach(() => {
  closeAllStores();
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

describe("retention sweep", () => {
  test("retention windows are independently configurable", () => {
    const orchDir = fixture();
    writeFileSync(join(orchDir, "settings.json"), JSON.stringify({
      schemaVersion: SETTINGS_SCHEMA, runtime: "node", retention: { runs_days: 3 },
    }));
    const retention = loadConfigOrNull(orchDir)!.retention;
    expect(retention.runs_days).toBe(3);
    expect(retention.ended_agents_days).toBe(90);
    expect(retention.queue_days).toBe(14);
    expect(retention.events_days).toBe(7);
    expect(retention.outbox_days).toBe(7);
    expect(retention.logs_days).toBe(7);
  });
  test("uses each table's own window and keeps queued and claimed tasks", () => {
    const orchDir = fixture();
    seedQueueTask(orchDir, "queue-old", "done", "2026-01-01T00:00:00.000Z");
    seedQueueTask(orchDir, "queue-new", "done", "2026-01-25T00:00:00.000Z");
    seedQueueTask(orchDir, "queued-old", "queued", "2026-01-01T00:00:00.000Z");
    seedQueueTask(orchDir, "claimed-old", "claimed", "2026-01-01T00:00:00.000Z");
    insertOutboxMessage(orchDir, { id: "out-old", target: "x", payload: {}, createdAt: Date.parse("2026-01-20T00:00:00.000Z") });
    insertOutboxMessage(orchDir, { id: "out-new", target: "x", payload: {}, createdAt: Date.parse("2026-01-28T00:00:00.000Z") });
    markOutboxDelivered(orchDir, "out-old");
    markOutboxDelivered(orchDir, "out-new");
    appendEvent(orchDir, Date.parse("2026-01-20T00:00:00.000Z"), { id: "event-old" });
    appendEvent(orchDir, Date.parse("2026-01-30T00:00:00.000Z"), { id: "event-new" });
    upsertRun(orchDir, run("run-old", "2025-12-20T00:00:00.000Z"));
    upsertRun(orchDir, run("run-new", "2026-01-20T00:00:00.000Z"));
    expect(sweepExpiredRows(orchDir, config({ queue_days: 14, events_days: 3, runs_days: 30, outbox_days: 7 }), NOW)).toEqual({
      queue: 1, outbox: 1, events: 1, runs: 1, ended_agents: 0, logs: 0,
    });
    expect(orm(orchDir).all(sql`SELECT id FROM tasks ORDER BY id`)).toHaveLength(3);
    expect(orm(orchDir).all(sql`SELECT id FROM outbox ORDER BY id`)).toHaveLength(1);
    expect(orm(orchDir).all(sql`SELECT seq FROM events`)).toHaveLength(1);
    expect(selectRuns(orchDir)).toHaveLength(1);
  });

  test("returns zero counts when every row is inside its window", () => {
    const orchDir = fixture();
    seedQueueTask(orchDir, "queue", "done", "2026-01-31T00:00:00.000Z");
    expect(sweepExpiredRows(orchDir, config(), NOW)).toEqual({ queue: 0, outbox: 0, events: 0, runs: 0, ended_agents: 0, logs: 0 });
  });

  test("continues sweeping when one table delete fails", () => {
    const orchDir = fixture();
    appendEvent(orchDir, Date.parse("2020-01-01T00:00:00.000Z"), { old: true });
    upsertRun(orchDir, run("old-run", "2020-01-01T00:00:00.000Z"));
    orm(orchDir).run(sql.raw("DROP TABLE tasks"));

    const counts = sweepExpiredRows(orchDir, config({ events_days: 1, runs_days: 1 }), NOW);
    expect(counts.queue).toBe(0);
    expect(counts.events).toBe(1);
    expect(counts.runs).toBe(1);
  });

  // A1: an ended agent is reaped by its IDENTITY. Its environment, its lease and
  // its worktree are satellites of that id and go with it; nothing is keyed by a
  // pane, so nothing survives because a presence directory was never created.
  test("reaps expired agents by identity, taking every satellite with them", () => {
    const orchDir = fixture();
    const agentId = "expirednop";
    const holder = "holderorch";
    const old = "2026-01-20T00:00:00.000Z";
    const db = orm(orchDir);
    db.run(sql`INSERT OR IGNORE INTO harnesses(id,name) VALUES ('pi','Pi')`);
    db.run(sql`INSERT OR IGNORE INTO plexers(id,name) VALUES ('headless','headless')`);
    db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${holder},${holder},${"pi"},${"/tmp"},${holder},${Date.parse(old)})`);
    db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${agentId},${agentId},${"pi"},${"/tmp"},${"reserved-agent"},${Date.parse(old)})`);
    db.run(sql`INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES (${agentId},${Date.parse(old)},NULL)`);
    db.run(sql`INSERT INTO agent_worktrees(agent_id,path,branch) VALUES (${agentId},${"/tmp/worktree"},${"orch/expired"})`);
    db.run(sql`INSERT INTO agent_plexers(agent_id,plexer_id) VALUES (${agentId},${"headless"})`);
    acquireLease(orchDir, agentId, holder, Date.parse(old));

    expect(sweepExpiredRows(orchDir, config({ ended_agents_days: 7 }), NOW).ended_agents).toBe(1);
    expect(row(db, sql`SELECT id FROM agents WHERE id=${agentId}`)).toBeUndefined();
    expect(row(db, sql`SELECT agent_id FROM agent_worktrees WHERE agent_id=${agentId}`)).toBeUndefined();
    expect(row(db, sql`SELECT agent_id FROM agent_plexers WHERE agent_id=${agentId}`)).toBeUndefined();
    expect(row(db, sql`SELECT id FROM agent_leases WHERE agent_id=${agentId}`)).toBeUndefined();
    expect(row(db, sql`SELECT id FROM agents WHERE name=${"reserved-agent"}`)).toBeUndefined();
    // The holder is an agent in its own right and outlives what it held.
    expect(row(db, sql`SELECT id FROM agents WHERE id=${holder}`)).not.toBeUndefined();
  });

  test("reaps dead dirs by recorded instants, not a fresh directory mtime", () => {
    const orchDir = fixture();
    const key = "deadagent1";
    const old = "2026-01-20T00:00:00.000Z";
    const dir = seedStatus(orchDir, key, { pid: 999999, updatedAt: old });
    const db = orm(orchDir);
    db.run(sql`INSERT OR IGNORE INTO harnesses(id,name) VALUES ('pi','Pi')`);
    db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES (${key},${key},${"pi"},${"/tmp"},${key},${Date.parse(old)})`);
    db.run(sql`INSERT INTO agent_endings(agent_id,ended_at,closed_by) VALUES (${key},${Date.parse(old)},NULL)`);
    utimesSync(dir, NOW, NOW);
    expect(sweepExpiredRows(orchDir, config({ ended_agents_days: 7 }), NOW).ended_agents).toBe(1);
    expect(existsSync(dir)).toBe(false);
    expect(row(orm(orchDir), sql`SELECT id FROM agents WHERE id=${key}`)).toBeUndefined();
  });

  test("keeps dead dirs with a newer recorded instant despite an old mtime", () => {
    const orchDir = fixture();
    const key = "deadagentn";
    const dir = seedStatus(orchDir, key, { pid: 999999, updatedAt: "2026-01-20T00:00:00.000Z" });
    writeResult(dir, { schema: PRESENCE_SCHEMA, text: "done", finishedAt: "2026-01-31T00:00:00.000Z" });
    utimesSync(dir, new Date("2020-01-01T00:00:00.000Z"), new Date("2020-01-01T00:00:00.000Z"));
    expect(sweepExpiredRows(orchDir, config({ ended_agents_days: 7 }), NOW).ended_agents).toBe(0);
    expect(existsSync(dir)).toBe(true);
  });

  test("reaps malformed dead dirs with no recorded instant", () => {
    const orchDir = fixture();
    const key = "deadagentm";
    const dir = seedStatus(orchDir, key, { pid: 999999 });
    writeResult(dir, { schema: PRESENCE_SCHEMA, text: "done" });
    utimesSync(dir, NOW, NOW);
    expect(sweepExpiredRows(orchDir, config({ ended_agents_days: 7 }), NOW).ended_agents).toBe(1);
    expect(existsSync(dir)).toBe(false);
  });

  test("keeps result-only recorded instant despite an old mtime", () => {
    const orchDir = fixture();
    const key = "deadagentr";
    const dir = seedStatus(orchDir, key, { pid: 999999 });
    writeFileSync(join(dir, "status.json"), "not valid status");
    writeResult(dir, { schema: PRESENCE_SCHEMA, text: "done", finishedAt: "2026-01-31T00:00:00.000Z" });
    utimesSync(dir, new Date("2020-01-01T00:00:00.000Z"), new Date("2020-01-01T00:00:00.000Z"));
    expect(sweepExpiredRows(orchDir, config({ ended_agents_days: 7 }), NOW).ended_agents).toBe(0);
    expect(existsSync(dir)).toBe(true);
  });

  test("never reaps a live presence dir regardless of age", () => {
    const orchDir = fixture();
    const dir = seedStatus(orchDir, "liveagent1", { pid: process.pid });
    const old = new Date(NOW.getTime() - 100 * 24 * 60 * 60 * 1000);
    utimesSync(dir, old, old);
    expect(sweepExpiredRows(orchDir, config({ ended_agents_days: 1 }), NOW).ended_agents).toBe(0);
    expect(existsSync(dir)).toBe(true);
  });

  test("sweeps old logs but preserves logs for live agents", () => {
    const orchDir = fixture();
    const logs = join(orchDir, "logs");
    mkdirSync(logs);
    const deadLog = join(logs, "deadagent1.log");
    const liveLog = join(logs, "liveagent1.log");
    writeFileSync(deadLog, "dead");
    writeFileSync(liveLog, "live");
    seedStatus(orchDir, "liveagent1", { pid: process.pid });
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

  test("prunes orch's own logs past the age cap", () => {
    const orchDir = fixture();
    const daemonLog = join(orchDir, "orchd.log");
    const cliLog = join(orchDir, "orch.log");
    writeFileSync(daemonLog, `${JSON.stringify({ at: 1, level: "info", event: "daemon.started" })}\n`);
    writeFileSync(cliLog, `${JSON.stringify({ at: 1, level: "info", event: "dispatch.cli-accepted" })}\n`);
    const old = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
    utimesSync(daemonLog, old, old);
    utimesSync(cliLog, old, old);

    expect(sweepExpiredRows(orchDir, config({ logs_days: 7 }), NOW).logs).toBe(2);
    expect(existsSync(daemonLog)).toBe(false);
    expect(existsSync(cliLog)).toBe(false);
  });

  test("prunes orch's own logs past the size cap even when freshly written", () => {
    const orchDir = fixture();
    const daemonLog = join(orchDir, "orchd.log");
    const cliLog = join(orchDir, "orch.log");
    // A daemon resident for a month must not have a gigabyte log: the size cap is
    // the only thing that bounds a file whose mtime is refreshed on every record.
    writeFileSync(daemonLog, "x".repeat(ORCH_LOG_MAX_BYTES + 1));
    writeFileSync(cliLog, "x".repeat(16));
    utimesSync(daemonLog, NOW, NOW);
    utimesSync(cliLog, NOW, NOW);

    expect(sweepExpiredRows(orchDir, config({ logs_days: 7 }), NOW).logs).toBe(1);
    expect(existsSync(daemonLog)).toBe(false);
    expect(existsSync(cliLog)).toBe(true);
  });
});
