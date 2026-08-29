import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { insertAgent } from "../src/store/agent-rows.ts";
import { enqueueTask, claimTask, settleAttempt } from "../src/store/task-rows.ts";
import { deliverTaskResult } from "../src/daemon/result-delivery.ts";
import { INBOX_FILE } from "../src/presence/schema.ts";
import { presenceAgentDir, presenceFile } from "../src/presence/writer.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * TASKS/02-scope.md Cq4 — "Results go to the enqueuer, not the runner —
 * cross-pack delivery is orch↔orch messaging."
 *
 * The hard case the row names is the CROSS-PACK one: the agent that ran the
 * work and the orch that asked for it are in different packs, so there is no
 * shared parent to hand the result up to. Orch's own mechanism carries it —
 * `inbox.jsonl`, the same writer every steer and handoff uses (Rule 11:
 * delivery and read are ORCH's, and a pane is only an optimisation).
 *
 * Keying an event to the enqueuer is not delivery: an event stream is read by
 * whoever happens to be watching. A result must ARRIVE.
 */

const dirs: string[] = [];
const savedOrchDir = process.env.ORCH_DIR;
afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (savedOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = savedOrchDir;
});

function fixture(): string {
  const d = mkdtempSync(join(tmpdir(), "orch-cross-pack-result-"));
  dirs.push(d);
  process.env.ORCH_DIR = d;
  openStore(d).query("INSERT INTO harnesses(id,name) VALUES (?,?)").run("pi", "Pi");
  // Two packs. `asker` is its own root; `runner` is rooted in `otherorch`.
  insertAgent(d, { id: "asker", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "asker", createdAt: 1 });
  insertAgent(d, { id: "otherorch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "otherorch", createdAt: 2 });
  insertAgent(d, { id: "runner", spawnedBy: "otherorch", harnessId: "pi", cwd: "/repo", name: "runner", createdAt: 3 });
  return d;
}

function inboxOf(key: string): string {
  const file = presenceFile(presenceAgentDir(key), INBOX_FILE);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

describe("results go to the enqueuer across packs (Cq4)", () => {
  test("a result reaches the FOREIGN enqueuer's inbox, not the runner's", () => {
    const d = fixture();
    seedStatus(d, "asker", { agent: "pi", pid: process.pid, state: "idle" });
    seedStatus(d, "runner", { agent: "pi", pid: process.pid, state: "working" });
    enqueueTask(d, { id: "t1", text: "survey the repo", opts: {}, enqueuedBy: "asker", scopeAgentId: "runner", createdAt: 5 });
    claimTask(d, "t1", "runner", "d1", 6);
    settleAttempt(d, "t1", 6, 7, "done", { result: { findings: 3 } });

    deliverTaskResult(d, "t1");

    // The enqueuer is in another pack, so nothing structural carries the result
    // to it. Orch's own inbox does.
    const inbox = inboxOf("asker");
    expect(inbox).toContain("survey the repo");
    expect(inbox).toContain("runner");
    // The runner asked for nothing and must not receive its own result back.
    expect(inboxOf("runner")).toBe("");
  });

  test("the delivered line carries the result payload, not just a notification", () => {
    const d = fixture();
    seedStatus(d, "asker", { agent: "pi", pid: process.pid, state: "idle" });
    seedStatus(d, "runner", { agent: "pi", pid: process.pid, state: "working" });
    enqueueTask(d, { id: "t1", text: "count things", opts: {}, enqueuedBy: "asker", scopeAgentId: "runner", createdAt: 5 });
    claimTask(d, "t1", "runner", "d1", 6);
    settleAttempt(d, "t1", 6, 7, "done", { result: { findings: 3 } });

    deliverTaskResult(d, "t1");

    // A result the enqueuer has to go and fetch is not delivery.
    expect(inboxOf("asker")).toContain("findings");
  });

  test("a FAILED task still reports back — silence is the worst outcome", () => {
    const d = fixture();
    seedStatus(d, "asker", { agent: "pi", pid: process.pid, state: "idle" });
    seedStatus(d, "runner", { agent: "pi", pid: process.pid, state: "working" });
    enqueueTask(d, { id: "t1", text: "risky work", opts: {}, enqueuedBy: "asker", scopeAgentId: "runner", createdAt: 5 });
    claimTask(d, "t1", "runner", "d1", 6);
    settleAttempt(d, "t1", 6, 7, "failed", { error: "the tool blew up" });

    deliverTaskResult(d, "t1");

    expect(inboxOf("asker")).toContain("the tool blew up");
  });

  test("an enqueuer with no inbox is not an error — delivery is best-effort, the task stays settled", () => {
    const d = fixture();
    seedStatus(d, "runner", { agent: "pi", pid: process.pid, state: "working" });
    enqueueTask(d, { id: "t1", text: "work", opts: {}, enqueuedBy: "asker", scopeAgentId: "runner", createdAt: 5 });
    claimTask(d, "t1", "runner", "d1", 6);
    settleAttempt(d, "t1", 6, 7, "done", { result: { ok: true } });

    // `asker` has no presence dir at all. A result that cannot be delivered
    // must not throw and must not undo the settlement.
    expect(() => deliverTaskResult(d, "t1")).not.toThrow();
  });
});
