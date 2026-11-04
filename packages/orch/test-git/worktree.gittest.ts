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
import { createAgentWorktree, discardFreshWorktree, listAgentWorktrees } from "../src/worktrees/agent.ts";
import { checkedOutBranch } from "../src/worktrees/repository.ts";
import { worktreeProvider } from "../src/worktrees/registry.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import type { WorktreeConfig, WorktreeProviderId } from "../src/types/worktree.ts";
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

const CONFIG: WorktreeConfig = SETTINGS_DEFAULTS.worktrees;

function git(directory: string, ...args: string[]): string {
  return execFileSync("git", ["-C", directory, "-c", "user.name=orch-test", "-c", "user.email=orch-test@localhost", ...args], { encoding: "utf8" }).trim();
}

/** Write one file and commit it. */
function commitFile(directory: string, file: string, text: string, message: string): void {
  writeFileSync(join(directory, file), text);
  git(directory, "add", ".");
  git(directory, "commit", "-qm", message);
}

/** Worktrunk's template points beside the repository, so it stays in the temp dir too. */
function worktrunkConfigured(repo: string): void {
  mkdirSync(join(repo, ".config"), { recursive: true });
  commitFile(repo, ".config/wt.toml", `worktree-path = "{{ repo_path }}/.wt/{{ branch | sanitize }}"\n`, "worktrunk config");
}

describe.each<WorktreeProviderId>(["git", "worktrunk"])("agent worktrees through %s, inside a throwaway repository", (provider) => {
  function fixture(prefix: string): string {
    const repo = tempGitRepo(prefix);
    tempDirs.push(repo);
    worktrunkConfigured(repo);
    return repo;
  }

  test("create, list and discard one worktree and its branch", () => {
    const repo = fixture("orch-worktree-");
    const { worktree } = createAgentWorktree({ provider, config: CONFIG }, repo, "alpha");
    expect(worktree.base).toBe("main");
    expect(worktree.provider).toBe(provider);
    expect(listAgentWorktrees(repo, CONFIG.branch_prefix)).toEqual([worktree.path]);
    expect(checkedOutBranch(worktree.path)).toBe("orch/alpha");
    expect(branches(repo)).toContain("orch/alpha");

    discardFreshWorktree(worktree, CONFIG, (message) => { throw new Error(message); });
    expect(listAgentWorktrees(repo, CONFIG.branch_prefix)).toEqual([]);
    expect(existsSync(worktree.path)).toBe(false);
    expect(branches(repo)).toEqual(["main"]);
  });

  test("an agent launched from a subdirectory starts in that subdirectory", () => {
    const repo = fixture("orch-worktree-subdir-");
    mkdirSync(join(repo, "pkg"));
    commitFile(repo, "pkg/file.txt", "tracked\n", "pkg");
    const { cwd, worktree } = createAgentWorktree({ provider, config: CONFIG }, join(repo, "pkg"), "alpha");
    expect(cwd).toBe(join(worktree.path, "pkg"));
    expect(existsSync(join(cwd, "file.txt"))).toBe(true);
  });

  test("a leftover branch is refused with what to do about it", () => {
    const repo = fixture("orch-worktree-leftover-");
    createAgentWorktree({ provider, config: CONFIG }, repo, "alpha");
    expect(() => createAgentWorktree({ provider, config: CONFIG }, repo, "alpha")).toThrow("orch clean --worktrees");
  });

  test("a landing reaches the base it forked from, whatever the root has checked out", () => {
    const repo = fixture("orch-worktree-land-");
    git(repo, "checkout", "-qb", "feature");
    const { worktree } = createAgentWorktree({ provider, config: CONFIG }, repo, "alpha");
    commitFile(worktree.path, "work.txt", "done\n", "work");
    git(repo, "checkout", "-q", "main");

    const tool = worktreeProvider(provider, CONFIG);
    tool.land({ root: repo, worktree: worktree.path, branch: worktree.branch, base: worktree.base });
    tool.remove({ root: repo, worktree: worktree.path, branch: worktree.branch, discard: true });

    expect(git(repo, "log", "-1", "--format=%s", "feature")).toBe("work");
    expect(existsSync(worktree.path)).toBe(false);
    expect(branches(repo)).not.toContain("orch/alpha");
  });

  test("a conflicted landing leaves both branches as they were", () => {
    const repo = fixture("orch-worktree-conflict-");
    commitFile(repo, "shared.txt", "root\n", "shared");
    const { worktree } = createAgentWorktree({ provider, config: CONFIG }, repo, "alpha");
    commitFile(worktree.path, "shared.txt", "agent\n", "agent edit");
    commitFile(repo, "shared.txt", "human\n", "human edit");
    const agentHead = git(worktree.path, "rev-parse", "HEAD");
    const baseHead = git(repo, "rev-parse", "main");

    expect(() => worktreeProvider(provider, CONFIG).land({ root: repo, worktree: worktree.path, branch: worktree.branch, base: worktree.base })).toThrow("left untouched");
    expect(git(worktree.path, "rev-parse", "HEAD")).toBe(agentHead);
    expect(git(repo, "rev-parse", "main")).toBe(baseHead);
    expect(git(worktree.path, "status", "--porcelain")).toBe("");
  });
});

describe("agent worktrees, inside a throwaway repository", () => {

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
      const refusal = await cmdSpawn(services, ["capped", "--dir", repo, "--harness", "pi", "--plexer", "headless", "--prompt", "work", "--worktree", "--json"])
        .then(() => null, (error: unknown) => (error instanceof Error ? error.message : String(error)));
      expect(refusal).toMatch(/spawn refused:.*pack cap 1/);
    } finally {
      Object.defineProperty(headlessBackend, "spawn", { value: originalSpawn, configurable: true, writable: true });
    }
    expect(existsSync(join(repo, ".orch-worktrees"))).toBe(false);
    expect(listAgentWorktrees(repo, CONFIG.branch_prefix)).toEqual([]);
    expect(branches(repo)).toEqual(["main"]);
  });
});
