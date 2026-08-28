import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, cancelTask, listTasks } from "../src/queue.ts";
import { renderQueueTasks } from "../src/commands/queue.ts";
import { openStore, closeAllStores } from "../src/store/connection.ts";

describe("commands/queue", () => {
  test("round-trips add/list/cancel on an isolated store", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-command-queue-"));
    try {
      const db = openStore(dir);
      db.query("INSERT INTO harnesses(id,name) VALUES ('pi','Pi')").run();
      db.query("INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('orch','orch','pi','/tmp','orch',1)").run();
      const task = addTask(dir, "compile", { agent: "pi" }, "orch");
      expect(listTasks(dir)).toHaveLength(1);
      expect(cancelTask(dir, task.id, "orch")).toMatchObject({ id: task.id, state: "cancelled" });
      expect(listTasks(dir).filter((entry) => entry.state === "cancelled")).toHaveLength(1);
      expect(() => cancelTask(dir, "missing", "orch")).toThrow("Unknown queue task");
    } finally { closeAllStores(); removeTempDir(dir); }
  });
  test("renders empty queues without throwing", () => renderQueueTasks([]));
});
