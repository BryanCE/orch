import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  createAgentWorktree,
  mergeReviewBranch,
  removeMergedWorktree,
  repositoryBranch,
  worktreeBranch,
} from "../src/worktree.ts";
import { insertSpawnedRecord } from "../src/store/sqlite.ts";

const directories: string[] = [];

function git(repoRoot: string, args: string[]): string {
  return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
}

function fixtureRepo(): string {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orch-review-"));
  directories.push(repoRoot);
  git(repoRoot, ["init"]);
  git(repoRoot, ["config", "user.email", "test@example.com"]);
  git(repoRoot, ["config", "user.name", "Orch Test"]);
  fs.writeFileSync(path.join(repoRoot, "README.md"), "base\n");
  git(repoRoot, ["add", "README.md"]);
  git(repoRoot, ["commit", "-m", "initial"]);
  return repoRoot;
}

function commit(worktreePath: string, file: string, contents: string, message: string): void {
  fs.writeFileSync(path.join(worktreePath, file), contents);
  git(worktreePath, ["add", file]);
  git(worktreePath, ["commit", "-m", message]);
}

function registerDoneAgent(orchDir: string, pane: string, worktreePath: string, branch: string): void {
  fs.mkdirSync(path.join(orchDir, "agents", pane), { recursive: true });
  fs.writeFileSync(path.join(orchDir, "agents", pane, "status.json"), JSON.stringify({
    schema: 2, agent: "pi", paneId: pane, pid: process.pid, state: "done", task: "finish the feature",
  }));
  insertSpawnedRecord(orchDir, {
    pane, ts: new Date().toISOString(), adapter: "pi", worktree: worktreePath, branch,
  });
}

function runOrch(repoRoot: string, orchDir: string, ...args: string[]): string {
  return execFileSync("bun", [path.join(import.meta.dir, "../bin/orch.ts"), ...args], {
    cwd: repoRoot,
    env: { ...process.env, ORCH_DIR: orchDir },
    encoding: "utf8",
  });
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("review plumbing", () => {
  test("lists only done worktree agents with commits ahead", () => {
    const repoRoot = fixtureRepo();
    const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-review-dir-"));
    directories.push(orchDir);
    const worktreePath = createAgentWorktree(repoRoot, "feature-1");
    commit(worktreePath, "feature.txt", "feature\n", "add feature");
    registerDoneAgent(orchDir, "pane-1", worktreePath, worktreeBranch(worktreePath));

    const result = JSON.parse(runOrch(repoRoot, orchDir, "review", "list", "--json"));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ target: "feature-1", state: "done", commitsAhead: 1, summary: "add feature" });
    expect(result[0].diff).toContain("feature.txt");
  });

  test("reject re-dispatches feedback through the adapter inbox", () => {
    const repoRoot = fixtureRepo();
    const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-review-dir-"));
    directories.push(orchDir);
    const worktreePath = createAgentWorktree(repoRoot, "iterate-1");
    commit(worktreePath, "feature.txt", "feature\n", "first pass");
    registerDoneAgent(orchDir, "pane-1", worktreePath, worktreeBranch(worktreePath));

    expect(runOrch(repoRoot, orchDir, "review", "reject", "iterate-1", "-m", "handle the empty case")).toContain("re-dispatched");
    expect(fs.readFileSync(path.join(orchDir, "agents", "pane-1", "inbox.jsonl"), "utf8")).toContain("handle the empty case");
    expect(fs.existsSync(worktreePath)).toBe(true);
  });

  test("approve merges and removes the worktree and branch", () => {
    const repoRoot = fixtureRepo();
    const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-review-dir-"));
    directories.push(orchDir);
    const worktreePath = createAgentWorktree(repoRoot, "approve-1");
    const branch = worktreeBranch(worktreePath);
    commit(worktreePath, "approved.txt", "approved\n", "approved change");
    registerDoneAgent(orchDir, "pane-1", worktreePath, branch);

    expect(runOrch(repoRoot, orchDir, "review", "approve", "approve-1")).toContain("fast-forward");
    expect(fs.existsSync(path.join(repoRoot, "approved.txt"))).toBe(true);
    expect(fs.existsSync(worktreePath)).toBe(false);
    expect(() => git(repoRoot, ["show-ref", "--verify", `refs/heads/${branch}`])).toThrow();
  });

  test("conflicting approval aborts without changing either branch", () => {
    const repoRoot = fixtureRepo();
    const worktreePath = createAgentWorktree(repoRoot, "conflict-1");
    const branch = worktreeBranch(worktreePath);
    commit(worktreePath, "README.md", "branch\n", "branch change");
    commit(repoRoot, "README.md", "base change\n", "base change");
    const branchHead = git(worktreePath, ["rev-parse", "HEAD"]);

    expect(() => mergeReviewBranch(repoRoot, branch)).toThrow("merge aborted");
    expect(git(repoRoot, ["rev-parse", "HEAD"])).not.toBe(branchHead);
    expect(git(worktreePath, ["rev-parse", "HEAD"])).toBe(branchHead);
    expect(fs.readFileSync(path.join(repoRoot, "README.md"), "utf8")).toBe("base change\n");
    git(repoRoot, ["worktree", "remove", "--force", worktreePath]);
    git(repoRoot, ["branch", "-D", branch]);
  });

  test("non-fast-forward approval creates a merge commit", () => {
    const repoRoot = fixtureRepo();
    const worktreePath = createAgentWorktree(repoRoot, "merge-1");
    const branch = worktreeBranch(worktreePath);
    commit(worktreePath, "branch.txt", "branch\n", "branch change");
    commit(repoRoot, "base.txt", "base\n", "base change");

    expect(mergeReviewBranch(repoRoot, branch)).toBe("merge-commit");
    expect(git(repoRoot, ["show", "-s", "--format=%P", "HEAD"]).split(/\s+/)).toHaveLength(2);
    removeMergedWorktree(repoRoot, worktreePath, branch);
  });
});
