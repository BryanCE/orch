import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, claimTask, listTasks, nextQueuedTask } from "../src/queue.ts";
import { openStore } from "../src/store/connection.ts";
import { insertOutboxMessage, selectPendingOutbox } from "../src/store/outbox-rows.ts";
import { acquireLease, adoptLease, currentLease, leaseHistory } from "../src/store/lease-rows.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const tempDirs: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
});

function seedPack(dir: string): void {
  const db = openStore(dir);
  db.query("INSERT INTO harnesses(id,name) VALUES ('pi','Pi')").run();
  db.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('orch','orch','pi','/tmp','orch',1)").run();
  db.query("INSERT INTO agents(id,spawned_by,root_agent_id,harness_id,cwd,name,created_at) VALUES ('worker','orch','orch','pi','/tmp','worker',1)").run();
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
    const journal = openStore(dir).query("PRAGMA journal_mode").get() as { journal_mode: string };
    insertOutboxMessage(dir, { id: "schema-probe", target: "test", payload: {}, createdAt: Date.parse("2026-01-01T00:00:00.000Z") });
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
    openStore(dir).query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('orch2','orch2','pi','/tmp','orch2',1)").run();
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
    // orch has no built-in configuration: a spawned CLI reads its composition from this ORCH_DIR.
    writeSettingsFixture(dir, { enabled: { adapters: ["pi"], backends: [] }, defaults: { adapter: "pi" } });
    const emptyPath = tempDir("orch-routing-path-");
    const child = Bun.spawn([process.execPath, "bin/orch.ts", "status", "--offline", "--local", "--json"], {
      cwd: join(import.meta.dir, ".."),
      env: { ...process.env, ORCH_DIR: dir, PATH: emptyPath },
      stdout: "pipe",
      stderr: "pipe",
    });
    const exit = await child.exited;
    expect(exit).toBe(0);
    expect(await new Response(child.stdout).text()).toBe("[]\n");
    expect(Bun.file(join(dir, "orchd.lock")).size).toBe(0);
  }, 15_000);
});
