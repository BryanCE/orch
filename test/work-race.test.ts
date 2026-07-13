import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, listTasks } from "../src/queue";

type Runner = ReturnType<typeof Bun.spawn>;

const tempDirs: string[] = [];

function makeFixture(): { orchDir: string; agentKey: string; taskId: string } {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-work-race-"));
  tempDirs.push(orchDir);

  // This is deliberately an unreachable-but-idle herdr pane. The race assertion
  // stops at the claim boundary; no real dispatch can happen in this fixture.
  const agentKey = "fake:p1";
  const agentDir = join(orchDir, "agents", agentKey);
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(
    join(agentDir, "status.json"),
    JSON.stringify({ pid: process.pid, paneId: agentKey, agent: "pi", state: "idle" }),
  );

  return { orchDir, agentKey, taskId: addTask(orchDir, "race this task").id };
}

async function waitForClaim(orchDir: string): Promise<void> {
  const queuePath = join(orchDir, "queue", "queue.jsonl");
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (existsSync(queuePath) && readFileSync(queuePath, "utf8").includes('"ev":"claim"')) return;
    await Bun.sleep(10);
  }
  throw new Error("timed out waiting for a claim event");
}

function startRunner(orchDir: string): Runner {
  return Bun.spawn(["bun", "bin/orch.ts", "work", "--once"], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, ORCH_DIR: orchDir },
    stdout: "pipe",
    stderr: "pipe",
  });
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("orch work claim race", () => {
  test(
    "two concurrent workers produce one claim and the loser exits cleanly",
    async () => {
      const { orchDir, agentKey, taskId } = makeFixture();
      const runners = [startRunner(orchDir), startRunner(orchDir)];

      await waitForClaim(orchDir);
      // Let the winner pass cmdWork's working-state check. Herdr is intentionally
      // unreachable, so this only verifies O_EXCL claim ownership, not dispatch.
      writeFileSync(
        join(orchDir, "agents", agentKey, "status.json"),
        JSON.stringify({ pid: process.pid, paneId: agentKey, agent: "pi", state: "working" }),
      );

      const exits = await Promise.all(runners.map((runner) => runner.exited));
      expect(exits).toEqual([0, 0]);

      const events = readFileSync(join(orchDir, "queue", "queue.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      expect(events.filter((event) => event.ev === "claim" && event.id === taskId)).toHaveLength(1);

      const claimFiles = readdirSync(join(orchDir, "queue", "claims"));
      expect(claimFiles).toEqual([taskId]);
      expect(listTasks(orchDir).filter((task) => task.id === taskId)).toEqual([
        expect.objectContaining({ id: taskId, state: "claimed", agentKey }),
      ]);
    },
    30_000,
  );
});
