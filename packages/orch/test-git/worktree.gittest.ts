// Runs git for real. `bun test` never picks this file up: the name matches no test
// pattern and the directory is outside ./test. Bryan runs it by hand:
//   bun run test:git
// Every git command here runs inside a throwaway repository under the temp dir and
// nothing else. A worktree or a branch can never land in the checkout.
import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { cmdSpawn } from "../src/commands/spawn/index.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { presenceAgentDir } from "../src/presence/history.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { orm } from "../src/store/connection.ts";
import { createAgentWorktree, listAgentWorktrees, removeDiscardedWorktree, worktreeBranch } from "../src/worktree.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { seedAgent, seedOperator } from "../test/helpers/agent.ts";
import { servedServices } from "../test/helpers/daemon-state.ts";
import { isolateOrchEnv, restoreOrchEnv } from "../test/helpers/env.ts";
import { writeSettingsFixture } from "../test/helpers/settings.ts";
import { removeTempDir, tempGitRepo, tempOrchDir } from "../test/helpers/tempdir.ts";

const tempDirs: string[] = [];
const servers: RpcServer[] = [];

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (tempDirs.length) removeTempDir(tempDirs.pop()!);
  restoreOrchEnv();
});

function branches(repo: string): string[] {
  return execFileSync("git", ["-C", repo, "branch", "--list", "--format=%(refname:short)"], { encoding: "utf8" })
    .split("\n").map((line) => line.trim()).filter((line) => line !== "");
}

describe("agent worktrees, inside a throwaway repository", () => {
  test("create, list and discard one worktree and its branch", () => {
    const repo = tempGitRepo("orch-worktree-");
    tempDirs.push(repo);

    const worktree = createAgentWorktree(repo, "alpha");
    expect(worktree).toBe(join(repo, ".orch-worktrees", "alpha"));
    expect(listAgentWorktrees(repo)).toEqual([worktree]);
    expect(worktreeBranch(worktree)).toBe("orch/alpha");
    expect(branches(repo)).toContain("orch/alpha");

    removeDiscardedWorktree(repo, worktree, "orch/alpha");
    expect(listAgentWorktrees(repo)).toEqual([]);
    expect(existsSync(worktree)).toBe(false);
    expect(branches(repo)).toEqual(["main"]);
  });

  test("a refused --worktree spawn makes no worktree and no branch", async () => {
    isolateOrchEnv();
    const repo = tempGitRepo("orch-worktree-refused-");
    tempDirs.push(repo);
    const dir: OrchDir = tempOrchDir("orch-worktree-refused-dir-");
    tempDirs.push(dir);
    process.env.ORCH_DIR = dir;
    const cappedSettings = {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } },
      fleet: { max_agents_per_pack: 1 },
    };
    writeSettingsFixture(dir, cappedSettings);
    const key = "liveagent1";
    const owner = seedOperator(dir);
    orm(dir).run(sql`INSERT INTO spaces (id, name, created_by, created_at) VALUES (${"space"}, ${"space"}, NULL, ${1})`);
    seedAgent(key, { adapter: "pi", backend: "headless", space: "space", handle: key, spawnedBy: owner, owner }, dir);
    const statusDir = presenceAgentDir(key, dir);
    mkdirSync(statusDir, { recursive: true });
    writeFileSync(join(statusDir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: process.pid, state: "idle" }));
    const originalSpawn = headlessBackend.spawn.bind(headlessBackend);
    const refusingSpawn: typeof headlessBackend.spawn = () => { throw new Error("backend allocation should not occur after policy refusal"); };
    Object.defineProperty(headlessBackend, "spawn", { value: refusingSpawn, configurable: true, writable: true });
    const services = await servedServices({ orchDir: dir, settings: cappedSettings }, servers);
    try {
      const refusal = await cmdSpawn(services, ["capped", "--dir", repo, "--agent", "pi", "--backend", "headless", "--prompt", "work", "--worktree", "--json"])
        .then(() => null, (error: unknown) => (error instanceof Error ? error.message : String(error)));
      expect(refusal).toMatch(/spawn refused:.*pack cap 1/);
    } finally {
      Object.defineProperty(headlessBackend, "spawn", { value: originalSpawn, configurable: true, writable: true });
    }
    expect(existsSync(join(repo, ".orch-worktrees"))).toBe(false);
    expect(listAgentWorktrees(repo)).toEqual([]);
    expect(branches(repo)).toEqual(["main"]);
  });
});
