import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, listTasks } from "../src/queue";
import { presenceAgentDir } from "../src/store";

type Runner = ReturnType<typeof Bun.spawn>;

const tempDirs: string[] = [];

function makeFixture(): { orchDir: string; agentKey: string; taskId: string } {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-work-race-"));
  tempDirs.push(orchDir);

  // This is deliberately an unreachable-but-idle herdr pane. The race assertion
  // stops at the claim boundary; no real dispatch can happen in this fixture.
  const agentKey = "herdr~fake~p1";
  const agentDir = presenceAgentDir(agentKey, orchDir);
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(
    join(agentDir, "status.json"),
    JSON.stringify({ schema: 2, key: agentKey, backend: "herdr", workspace: "fake", handle: "p1", pid: process.pid, paneId: "p1", agent: "pi", state: "idle" }),
  );

  return { orchDir, agentKey, taskId: addTask(orchDir, "race this task").id };
}

async function waitForClaim(orchDir: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (listTasks(orchDir).some((task) => task.state === "claimed")) return;
    await Bun.sleep(10);
  }
  throw new Error("timed out waiting for a claim");
}

function startRunner(orchDir: string): Runner {
  return Bun.spawn([process.execPath, "bin/orch.ts", "work", "--once"], {
    cwd: join(import.meta.dir, ".."),
    env: { ...process.env, ORCH_DIR: orchDir },
    stdout: "pipe",
    stderr: "pipe",
  });
}

afterEach(() => {
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
}, 30_000);

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
        join(presenceAgentDir(agentKey, orchDir), "status.json"),
        JSON.stringify({ schema: 2, key: agentKey, backend: "herdr", workspace: "fake", handle: "p1", pid: process.pid, paneId: "p1", agent: "pi", state: "working" }),
      );

      const exits = await Promise.all(runners.map((runner) => runner.exited));
      expect(exits).toEqual([0, 0]);

      // SQLite's conditional claim UPDATE is the exactly-once boundary now: two
      // OS processes contend, only one row transitions to claimed.
      const claimedTasks = listTasks(orchDir).filter((task) => task.state === "claimed");
      expect(claimedTasks).toHaveLength(1);
      const claimedTask = claimedTasks[0];
      expect(claimedTask?.id).toBe(taskId);
      expect(claimedTask?.state).toBe("claimed");
      expect(claimedTask?.agentKey).toBe(agentKey);
    },
    30_000,
  );
});
