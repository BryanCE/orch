import { execFileSync } from "node:child_process";
import * as filesystem from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  createAgentWorktree,
  listAgentWorktrees,
  removeWorktree,
  worktreeHasCommitsAheadOf,
} from "../src/worktree.ts";

const directories: string[] = [];

function git(repoRoot: string, args: string[]): string {
  return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
}

function fixtureRepo(): string {
  const repoRoot = filesystem.mkdtempSync(path.join(os.tmpdir(), "orch-worktree-"));
  directories.push(repoRoot);
  git(repoRoot, ["init"]);
  git(repoRoot, ["config", "user.email", "test@example.com"]);
  git(repoRoot, ["config", "user.name", "Orch Test"]);
  filesystem.writeFileSync(path.join(repoRoot, "README.md"), "fixture\n");
  git(repoRoot, ["add", "README.md"]);
  git(repoRoot, ["commit", "-m", "initial commit"]);
  return repoRoot;
}

afterEach(() => {
  while (directories.length) filesystem.rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("worktree primitives", () => {
  test("creates and lists an agent worktree on an orch branch", () => {
    const repoRoot = fixtureRepo();
    const worktreePath = createAgentWorktree(repoRoot, "fixes-1");

    expect(worktreePath).toBe(path.join(repoRoot, ".orch-worktrees", "fixes-1"));
    expect(filesystem.existsSync(worktreePath)).toBe(true);
    expect(git(worktreePath, ["branch", "--show-current"])).toBe("orch/fixes-1");
    expect(listAgentWorktrees(repoRoot)).toEqual([worktreePath]);
  }, 30_000);

  test("detects commits ahead of a base branch", () => {
    const repoRoot = fixtureRepo();
    const baseBranch = git(repoRoot, ["branch", "--show-current"]);
    const worktreePath = createAgentWorktree(repoRoot, "feature");

    expect(worktreeHasCommitsAheadOf(repoRoot, worktreePath, baseBranch)).toBe(false);
    filesystem.writeFileSync(path.join(worktreePath, "feature.txt"), "new work\n");
    git(worktreePath, ["add", "feature.txt"]);
    git(worktreePath, ["commit", "-m", "add feature"]);
    expect(worktreeHasCommitsAheadOf(repoRoot, worktreePath, baseBranch)).toBe(true);
  }, 30_000);

  test("removes an agent worktree", () => {
    const repoRoot = fixtureRepo();
    const worktreePath = createAgentWorktree(repoRoot, "remove-me");

    removeWorktree(repoRoot, worktreePath);

    expect(filesystem.existsSync(worktreePath)).toBe(false);
    expect(listAgentWorktrees(repoRoot)).toEqual([]);
  }, 30_000);

  test("rejects a non-repository path with a clear error", () => {
    const directory = filesystem.mkdtempSync(path.join(os.tmpdir(), "orch-not-a-repo-"));
    directories.push(directory);

    expect(() => createAgentWorktree(directory, "nope")).toThrow("Worktree mode requires a git repository");
  });
});
