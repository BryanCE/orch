import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { removeTempDir, tempOrchDir } from "../test/helpers/tempdir.ts";
import { addTask, claimTask, listTasks, nextQueuedTask } from "../src/queue.ts";
import { orm } from "../src/store/connection.ts";
import { insertOutboxMessage, selectPendingOutbox } from "../src/store/outbox-rows.ts";
import { acquireLease, adoptLease, currentLease, leaseHistory } from "../src/store/lease-rows.ts";
import { cmdStatusVerb } from "../src/commands/status/verb.ts";
import { createServices } from "../src/services.ts";
import { daemonOwnershipFiles } from "../src/daemon/client/runtime-files.ts";
import { writeSettingsFixture } from "../test/helpers/settings.ts";
import { captureStdout } from "../test/helpers/stdout.ts";
import { sql } from "drizzle-orm";

import { row } from "../test/helpers/rows.ts";
import type { OrchDir } from "../src/types/core.ts";
const tempDirs: OrchDir[] = [];

function tempDir(prefix: string): OrchDir {
  const dir = tempOrchDir(prefix);
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function seedPack(dir: OrchDir): void {
  const db = orm(dir);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
  db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('orch','orch','pi','/tmp','orch',1)`);
  db.run(sql`INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES ('worker','orch','orch','pi','/tmp','worker',1)`);
}

describe("store hardening", () => {
  test("stores hostile values as data and preserves pack selection", () => {
    const dir = tempDir("orch-routing-store-");
    seedPack(dir);
    const text = "'); DROP TABLE tasks; --";
    const task = addTask(dir, text, { constraints: { value: text } }, "orch");
    const tasks = listTasks(dir);

    expect(tasks.find((candidate) => candidate.id === task.id)?.text).toBe(text);
    expect(nextQueuedTask(dir, "worker", 1)?.id).toBe(task.id);
    expect(listTasks(dir)).toHaveLength(1);
  });

  test("a fresh store creates the full current schema with WAL enabled", () => {
    const dir = tempDir("orch-routing-schema-");
    expect(() => listTasks(dir)).not.toThrow();
    const journal = row(orm(dir), sql`PRAGMA journal_mode`) as { journal_mode: string };
    insertOutboxMessage(dir, { id: "schema-probe", target: "test", payload: { action: "dispatch", text: "schema probe" }, createdAt: Date.parse("2026-01-01T00:00:00.000Z") });
    expect(journal.journal_mode.toLowerCase()).toBe("wal");
    expect(selectPendingOutbox(dir, Number.MAX_SAFE_INTEGER)).toMatchObject([
      { id: "schema-probe", nextAttemptAt: 0 },
    ]);
    expect(() => listTasks(dir)).not.toThrow();
  });

  // A1: ownership is the lease, and the STORE is what makes it single. Two open
  // holdings for one agent is not a race to resolve in application code - the
  // `one_lease` index refuses the second outright, so ownership cannot fork.
  test("the store refuses a second open holding, so ownership cannot fork", () => {
    const dir = tempDir("orch-routing-owner-");
    seedPack(dir);
    expect(acquireLease(dir, "worker", "orch", 1)).toBeGreaterThan(0);
    expect(() => acquireLease(dir, "worker", "orch", 2)).toThrow("one_lease");
    expect(currentLease(dir, "worker")?.orchId).toBe("orch");
  });

  test("adoption closes the prior holding in the same step that opens the new one", () => {
    const dir = tempDir("orch-routing-adopt-");
    seedPack(dir);
    orm(dir).run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('orch2','orch2','pi','/tmp','orch2',1)`);
    acquireLease(dir, "worker", "orch", 1);
    adoptLease(dir, "worker", "orch2", 2);
    expect(currentLease(dir, "worker")?.orchId).toBe("orch2");
    expect(leaseHistory(dir, "worker").map((lease) => [lease.orchId, lease.until, lease.releaseReason]))
      .toEqual([["orch", 2, "adopted"], ["orch2", null, null]]);
  });

  test("the attempt insert claim is exactly once", () => {
    const dir = tempDir("orch-routing-claim-");
    seedPack(dir);
    const task = addTask(dir, "claim me", {}, "orch");
    expect(claimTask(dir, task.id, "worker", "dispatch-a")).toBe(true);
    expect(claimTask(dir, task.id, "orch", "dispatch-b")).toBe(false);
    expect(listTasks(dir).find((candidate) => candidate.id === task.id)?.attempts[0]?.agentId).toBe("worker");
  });
});

describe("CLI offline routing", () => {
  test("status --offline does not start or contact orchd", async () => {
    const dir = tempDir("orch-routing-cli-");
    // orch has no built-in configuration: the command reads its composition from this ORCH_DIR.
    writeSettingsFixture(dir, { enabled: { adapters: ["pi"], backends: [] }, defaults: { adapter: "pi" } });
    const output = await captureStdout(() => cmdStatusVerb(createServices({ orchDir: dir }), ["--offline", "--local", "--json"]));
    expect(JSON.parse(output)).toEqual({ names: { agents: {}, spaces: {} }, rows: [] });
    // A started or dialed orchd leaves its runtime files behind; offline leaves none.
    expect(daemonOwnershipFiles(dir).filter((file) => existsSync(file))).toEqual([]);
  });
});
