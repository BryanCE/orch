import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { createAgentWorktree, listAgentWorktrees, worktreeBranch } from "../src/worktree.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const directories: string[] = [];

/** orch has no built-in configuration, so a spawned CLI needs a recorded composition in its
 * ORCH_DIR exactly as a real install does. */
function orchDirWithSettings(): string {
  const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-clean-dir-"));
  directories.push(orchDir);
  writeSettingsFixture(orchDir, { installed: { adapters: ["pi"], backends: [] }, defaults: { adapter: "pi" } });
  return orchDir;
}

function git(repoRoot: string, args: string[]): string {
  return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
}

function fixtureRepo(): string {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orch-clean-worktree-"));
  directories.push(repoRoot);
  git(repoRoot, ["init"]);
  git(repoRoot, ["config", "user.email", "test@example.com"]);
  git(repoRoot, ["config", "user.name", "Orch Test"]);
  fs.writeFileSync(path.join(repoRoot, "README.md"), "fixture\n");
  git(repoRoot, ["add", "README.md"]);
  git(repoRoot, ["commit", "-m", "initial"]);
  return repoRoot;
}

function runOrch(repoRoot: string, orchDir: string, ...args: string[]): string {
  return execFileSync("bun", [path.join(import.meta.dir, "../bin/orch.ts"), ...args], {
    cwd: repoRoot,
    env: { ...process.env, ORCH_DIR: orchDir },
    encoding: "utf8",
  });
}

function commit(worktreePath: string, contents = "feature\n"): void {
  fs.writeFileSync(path.join(worktreePath, "feature.txt"), contents);
  git(worktreePath, ["add", "feature.txt"]);
  git(worktreePath, ["commit", "-m", "feature"]);
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("clean worktrees", () => {
  test("removes empty and merged orphan worktrees, but keeps unmerged work", () => {
    const repoRoot = fixtureRepo();
    const orchDir = orchDirWithSettings();
    const empty = createAgentWorktree(repoRoot, "empty");
    const merged = createAgentWorktree(repoRoot, "merged");
    const mergedBranch = worktreeBranch(merged);
    commit(merged, "merged\n");
    git(repoRoot, ["merge", "--ff-only", mergedBranch]);
    const unmerged = createAgentWorktree(repoRoot, "unmerged");
    commit(unmerged, "unmerged\n");

    const output = runOrch(repoRoot, orchDir, "clean", "--worktrees");
    expect(output).toContain(`Removed orphan worktree ${empty}`);
    expect(output).toContain(`Removed orphan worktree ${merged}`);
    expect(output).toContain(`Kept orphan worktree ${unmerged}`);
    expect(fs.existsSync(empty)).toBe(false);
    expect(fs.existsSync(merged)).toBe(false);
    expect(fs.existsSync(unmerged)).toBe(true);
    expect(listAgentWorktrees(repoRoot)).toEqual([unmerged]);
  }, 30_000);

  test("--force discards an unmerged orphan and its branch", () => {
    const repoRoot = fixtureRepo();
    const orchDir = orchDirWithSettings();
    const unmerged = createAgentWorktree(repoRoot, "discard");
    const branch = worktreeBranch(unmerged);
    commit(unmerged);

    const output = runOrch(repoRoot, orchDir, "clean", "--worktrees", "--force");
    expect(output).toContain(`Removed orphan worktree ${unmerged}`);
    expect(output).toContain("discarded unmerged commits");
    expect(fs.existsSync(unmerged)).toBe(false);
    expect(() => git(repoRoot, ["show-ref", "--verify", `refs/heads/${branch}`])).toThrow();
  }, 30_000);
});
