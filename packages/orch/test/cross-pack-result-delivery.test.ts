import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { acceptMail } from "../src/daemon/server/mail.ts";
import { deliverTaskResult } from "../src/daemon/server/result-delivery.ts";
import { isMailMessage } from "../src/control/bridge-message.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { insertAgent } from "../src/store/agent-rows.ts";
import { enqueueTask, insertAttempt, settleAttempt, taskState } from "../src/store/task-rows.ts";
import { selectPendingOutbox, selectOutboxMessage } from "../src/store/outbox-rows.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { sql } from "drizzle-orm";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { testServices } from "./helpers/services.ts";

/**
 * Results and peer messages are mail: an outbox row pushed down the recipient's
 * bridge link. A wall refusal is best-effort for settled task results.
 */

const dirs: OrchDir[] = [];
const savedOrchDir: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (savedOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = savedOrchDir;
});

function settingsFor(directory: OrchDir) {
  return testServices({ orchDir: directory, settings: { fleet: { cross_space: false } } }).settings.current();
}

function fixture(): OrchDir {
  const directory = tempOrchDir("orch-cross-pack-result-");
  dirs.push(directory);
  process.env.ORCH_DIR = directory;
  writeSettingsFixture(directory, { fleet: { cross_space: false } });
  orm(directory).run(sql`INSERT INTO harnesses(id,name) VALUES (${"pi"},${"Pi"})`);
  orm(directory).run(sql`INSERT INTO spaces(id,name,created_at) VALUES (${"ask-space"},${"Ask space"},1),(${"run-space"},${"Run space"},1)`);
  insertAgent(directory, { id: "asker", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "asker", createdAt: 1 });
  insertAgent(directory, { id: "otherorch", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "otherorch", createdAt: 2 });
  insertAgent(directory, { id: "runner", spawnedBy: "otherorch", harnessId: "pi", cwd: "/repo", name: "runner", createdAt: 3 });
  return directory;
}

function mailRow(directory: OrchDir, target: string) {
  return selectPendingOutbox(directory, Number.MAX_SAFE_INTEGER).find((row) => row.target === target);
}

function settledTask(directory: OrchDir, outcome: "done" | "failed" = "done"): void {
  enqueueTask(directory, { id: "t1", text: "survey the repo", opts: {}, enqueuedBy: "asker", scopeAgentId: "runner", createdAt: 5 });
  insertAttempt(directory, "t1", "runner", "d1", 6);
  if (outcome === "done") settleAttempt(directory, "t1", 6, 7, "done", { result: { findings: 3 } });
  else settleAttempt(directory, "t1", 6, 7, "failed", { error: "the tool blew up" });
}

describe("results go to the enqueuer as mail", () => {
  test("a result is an outbox row for the enqueuer, not the runner", () => {
    const directory = fixture();
    settledTask(directory);

    deliverTaskResult(directory, settingsFor(directory), "t1");

    const row = mailRow(directory, "asker");
    expect(row).toBeDefined();
    if (row === undefined) throw new Error("result mail row was not queued");
    const payload = row.payload;
    expect(isMailMessage(payload)).toBe(true);
    if (!isMailMessage(payload)) throw new Error("result payload is not mail");
    expect(payload.text).toContain("survey the repo");
    expect(payload.text).toContain('"findings":3');
    expect(payload.text).toContain("runner");
    expect(mailRow(directory, "runner")).toBeUndefined();
  });

  test("a failed task reports its error in the mail body", () => {
    const directory = fixture();
    settledTask(directory, "failed");

    deliverTaskResult(directory, settingsFor(directory), "t1");

    const row = mailRow(directory, "asker");
    expect(row).toBeDefined();
    if (row === undefined) throw new Error("failed result mail row was not queued");
    const payload = row.payload;
    expect(isMailMessage(payload)).toBe(true);
    if (!isMailMessage(payload)) throw new Error("failed result payload is not mail");
    expect(payload.text).toContain("the tool blew up");
  });

  test("a cross-wall enqueuer gets no row and the task stays settled", () => {
    const directory = fixture();
    setSpace(directory, "asker", 10, "ask-space");
    setSpace(directory, "runner", 10, "run-space");
    settledTask(directory);

    deliverTaskResult(directory, settingsFor(directory), "t1");

    expect(mailRow(directory, "asker")).toBeUndefined();
    expect(mailRow(directory, "runner")).toBeUndefined();
    expect(taskState(directory, "t1")).toBe("done");
  });
});

describe("acceptMail", () => {
  test("refuses a message across the space wall by its reason", () => {
    const directory = fixture();
    setSpace(directory, "asker", 10, "ask-space");
    setSpace(directory, "runner", 10, "run-space");

    expect(() => acceptMail(directory, settingsFor(directory), "asker", "runner", "hello"))
      .toThrow("space wall: actor space ask-space cannot write to target space run-space (runner)");
  });

  test("requires non-empty from, target, and text", () => {
    const directory = fixture();

    expect(() => acceptMail(directory, settingsFor(directory), "", "runner", "hello")).toThrow("from is required");
    expect(() => acceptMail(directory, settingsFor(directory), "asker", "  ", "hello")).toThrow("target is required");
    expect(() => acceptMail(directory, settingsFor(directory), "asker", "runner", "\t")).toThrow("text is required");
  });

  test("queues a mail payload naming its sender, routed by direction when it is delivered", () => {
    const directory = fixture();
    const accepted = acceptMail(directory, settingsFor(directory), "asker", "runner", "hello");
    const row = selectOutboxMessage(directory, accepted.id);

    expect(row).toBeDefined();
    if (row === undefined) throw new Error("mail row was not queued");
    expect(isMailMessage(row.payload)).toBe(true);
    expect(row.payload).toEqual({ action: "mail", from: "asker", text: "hello" });
  });
});
