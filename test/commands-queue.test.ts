import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, cancelTask, listTasks } from "../src/queue.ts";
import { renderQueueTasks } from "../src/commands/queue.ts";

describe("commands/queue", () => {
  test("round-trips add/list/cancel on an isolated store", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-command-queue-"));
    try {
      const task = addTask(dir, "compile", { agent: "pi" }, "ws");
      expect(listTasks(dir)).toHaveLength(1);
      expect(cancelTask(dir, task.id)).toMatchObject({ id: task.id, state: "cancelled" });
      expect(listTasks(dir).filter((entry) => entry.state === "cancelled")).toHaveLength(1);
      expect(() => cancelTask(dir, "missing")).toThrow("Unknown queue task");
    } finally { removeTempDir(dir); }
  });
  test("renders empty queues without throwing", () => renderQueueTasks([]));
});
