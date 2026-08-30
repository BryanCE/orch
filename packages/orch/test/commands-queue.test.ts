import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, cancelTask, listTasks } from "../src/queue.ts";
import { cmdQueue, renderQueueTasks } from "../src/commands/queue.ts";
import { orm, closeAllStores } from "../src/store/connection.ts";
import { sql } from "drizzle-orm";

describe("commands/queue", () => {
  test("cmdQueue list emits the selected JSON view", async () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-command-queue-seam-"));
    const oldDir = process.env.ORCH_DIR;
    const oldWrite = process.stdout.write.bind(process.stdout);
    let output = "";
    process.env.ORCH_DIR = dir;
    process.stdout.write = ((chunk: string | Uint8Array) => { output += chunk.toString(); return true; });
    try {
      const db = orm(dir);
      db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
      db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('orch','orch','pi','/tmp','orch',1)`);
      const task = addTask(dir, "seam task", {}, "orch");
      await cmdQueue(["list", "--json"]);
      expect(JSON.parse(output)).toEqual([expect.objectContaining({ id: task.id, text: "seam task", state: "queued" })]);
    } finally {
      process.stdout.write = oldWrite;
      if (oldDir === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = oldDir;
      closeAllStores();
      removeTempDir(dir);
    }
  });
  test("round-trips add/list/cancel on an isolated store", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-command-queue-"));
    try {
      const db = orm(dir);
      db.run(sql`INSERT INTO harnesses(id,name) VALUES ('pi','Pi')`);
      db.run(sql`INSERT INTO agents(id,root_agent_id,harness_id,cwd,name,created_at) VALUES ('orch','orch','pi','/tmp','orch',1)`);
      const task = addTask(dir, "compile", { agent: "pi" }, "orch");
      expect(listTasks(dir)).toHaveLength(1);
      expect(cancelTask(dir, task.id, "orch")).toMatchObject({ id: task.id, state: "cancelled" });
      expect(listTasks(dir).filter((entry) => entry.state === "cancelled")).toHaveLength(1);
      expect(() => cancelTask(dir, "missing", "orch")).toThrow("Unknown queue task");
    } finally { closeAllStores(); removeTempDir(dir); }
  });
  test("renders empty queues without throwing", () => renderQueueTasks([]));
});
