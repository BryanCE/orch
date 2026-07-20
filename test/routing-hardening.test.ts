import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, listTasks, nextQueuedTask } from "../src/queue.ts";
import { checkOwnerWrite, getOwner, setOwner, writeTaskClaim } from "../src/store/sqlite.ts";
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

describe("store hardening", () => {
  test("stores hostile values as data and preserves origin workspace selection", () => {
    const dir = tempDir("orch-routing-store-");
    const text = "'); DROP TABLE queue; --";
    const task = addTask(dir, text, { constraints: { value: text } }, "workspace-a");
    const other = addTask(dir, "other", {}, "workspace-b");
    const legacy = addTask(dir, "legacy");
    const tasks = listTasks(dir);

    expect(tasks.find((candidate) => candidate.id === task.id)?.text).toBe(text);
    expect(nextQueuedTask(tasks, "worker", "workspace-a")?.id).toBe(task.id);
    expect(nextQueuedTask(tasks, "worker", "workspace-b")?.id).toBe(other.id);
    expect(nextQueuedTask(tasks, "worker", "workspace-c")?.id).toBe(legacy.id);
    expect(listTasks(dir)).toHaveLength(3);
  });

  test("a fresh store creates the full current schema with WAL enabled", () => {
    const dir = tempDir("orch-routing-schema-");
    expect(() => listTasks(dir)).not.toThrow();
    const opened = new Database(join(dir, "orch.db"), { readonly: true });
    const journal = opened.query("PRAGMA journal_mode").get() as { journal_mode: string };
    const columns = opened.query("PRAGMA table_info(outbox)").all() as { name: string }[];
    opened.close();
    expect(journal.journal_mode.toLowerCase()).toBe("wal");
    expect(columns.some((column) => column.name === "next_attempt_at")).toBe(true);
    expect(() => listTasks(dir)).not.toThrow();
  });

  test("a steal updates ownership only when the observed owner still matches", () => {
    const dir = tempDir("orch-routing-owner-");
    setOwner(dir, "pane-1", "orch-a");
    expect(checkOwnerWrite(dir, "pane-1", "orch-b")).toEqual({ ok: false, reason: "agent is owned by orch-a" });
    expect(checkOwnerWrite(dir, "pane-1", "orch-b", { steal: true })).toEqual({ ok: true, reassigned: true });
    expect(getOwner(dir, "pane-1")).toBe("orch-b");
    expect(checkOwnerWrite(dir, "pane-1", "orch-a", { steal: true })).toEqual({ ok: true, reassigned: true });
    expect(getOwner(dir, "pane-1")).toBe("orch-a");
  });

  test("the conditional claim is exactly once", () => {
    const dir = tempDir("orch-routing-claim-");
    const task = addTask(dir, "claim me");
    expect(writeTaskClaim(dir, task.id, "worker-a", "2026-01-01T00:00:00.000Z")).toBe(true);
    expect(writeTaskClaim(dir, task.id, "worker-b", "2026-01-01T00:00:01.000Z")).toBe(false);
    expect(listTasks(dir).find((candidate) => candidate.id === task.id)?.agentKey).toBe("worker-a");
  });
});

describe("CLI offline routing", () => {
  test("status --offline does not start or contact orchd", async () => {
    const dir = tempDir("orch-routing-cli-");
    // orch has no built-in configuration: a spawned CLI reads its composition from this ORCH_DIR.
    writeSettingsFixture(dir, { installed: { adapters: ["pi"], backends: [] }, defaults: { adapter: "pi" } });
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
