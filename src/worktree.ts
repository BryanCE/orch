import { execFileSync } from "node:child_process";
import * as filesystem from "node:fs";
import * as path from "node:path";

function git(repoRoot: string, args: string[]): string {
  return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
}

function repositoryRoot(repoRoot: string): string {
  try {
    return git(repoRoot, ["rev-parse", "--show-toplevel"]);
  } catch {
    throw new Error(`Worktree mode requires a git repository: ${repoRoot}`);
  }
}

function agentWorktreePath(repoRoot: string, name: string): string {
  if (!name || name === "." || name === ".." || path.isAbsolute(name) || name.includes(path.sep)) {
    throw new Error(`Invalid worktree name: ${name}`);
  }
  return path.join(repoRoot, ".orch-worktrees", name);
}

/** Create an isolated worktree and its orch/<name> branch. */
export function createAgentWorktree(repoRoot: string, name: string): string {
  const root = repositoryRoot(repoRoot);
  const worktreePath = agentWorktreePath(root, name);
  filesystem.mkdirSync(path.dirname(worktreePath), { recursive: true });
  git(root, ["worktree", "add", "-b", `orch/${name}`, worktreePath]);
  return worktreePath;
}

/** List orch-managed worktree paths for a repository. */
export function listAgentWorktrees(repoRoot: string): string[] {
  const root = repositoryRoot(repoRoot);
  const agentDirectory = path.join(root, ".orch-worktrees");
  return git(root, ["worktree", "list", "--porcelain"])
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length))
    .filter((worktreePath) => {
      const relativePath = path.relative(agentDirectory, worktreePath);
      return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
    });
}

/** Remove an existing worktree without forcing deletion of uncommitted changes. */
export function removeWorktree(repoRoot: string, worktreePath: string): void {
  const root = repositoryRoot(repoRoot);
  git(root, ["worktree", "remove", worktreePath]);
}

/** Return whether a worktree's checked-out branch has commits beyond the base branch. */
export function worktreeHasCommitsAheadOf(repoRoot: string, worktreePath: string, baseBranch: string): boolean {
  repositoryRoot(repoRoot);
  return Number(git(worktreePath, ["rev-list", "--count", `${baseBranch}..HEAD`])) > 0;
}
