import { execFileSync } from "node:child_process";
import * as filesystem from "node:fs";
import * as path from "node:path";

function git(repoRoot: string, args: string[]): string {
  return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
}

export function repositoryRoot(repoRoot: string): string {
  try {
    return git(repoRoot, ["rev-parse", "--show-toplevel"]);
  } catch {
    throw new Error(`Worktree mode requires a git repository: ${repoRoot}`);
  }
}

/** Return the main repository root shared by all linked worktrees. */
export function repositoryCommonRoot(repoRoot: string): string {
  try {
    // `--path-format=absolute` was added after older Git versions still in use.
    // Resolve the (possibly relative) common-dir path ourselves instead.
    const commonDir = git(repoRoot, ["rev-parse", "--git-common-dir"]);
    return path.dirname(path.resolve(repoRoot, commonDir));
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
    .map((line) => path.normalize(line.slice("worktree ".length)))
    .filter((worktreePath) => {
      const relativePath = path.relative(agentDirectory, worktreePath);
      return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
    });
}

/** Remove an existing worktree, optionally discarding uncommitted changes. */
export function removeWorktree(repoRoot: string, worktreePath: string, force = false): void {
  const root = repositoryRoot(repoRoot);
  git(root, ["worktree", "remove", ...(force ? ["--force"] : []), worktreePath]);
}

/** Return the branch checked out in a repository worktree. */
export function worktreeBranch(worktreePath: string): string {
  const branch = git(worktreePath, ["branch", "--show-current"]);
  if (!branch) throw new Error(`Worktree is not on a branch: ${worktreePath}`);
  return branch;
}

/** Return the branch currently checked out at the repository root. */
export function repositoryBranch(repoRoot: string): string {
  const root = repositoryRoot(repoRoot);
  const branch = git(root, ["branch", "--show-current"]);
  if (!branch) throw new Error(`Repository is not on a branch: ${root}`);
  return branch;
}

/** Return whether a worktree's checked-out branch has commits beyond the base branch. */
export function worktreeHasCommitsAheadOf(repoRoot: string, worktreePath: string, baseBranch: string): boolean {
  repositoryRoot(repoRoot);
  return Number(git(worktreePath, ["rev-list", "--count", `${baseBranch}..HEAD`])) > 0;
}

/** Return whether a worktree contains uncommitted changes. */
export function worktreeHasChanges(worktreePath: string): boolean {
  return git(worktreePath, ["status", "--porcelain"]) !== "";
}

/** Return a compact summary and diff stat for a branch under review. */
export function worktreeReviewSummary(worktreePath: string, baseBranch: string, branch = worktreeBranch(worktreePath)): { summary: string; diff: string; commitsAhead: number } {
  const commitsAhead = Number(git(worktreePath, ["rev-list", "--count", `${baseBranch}..${branch}`]));
  const summary = commitsAhead > 0 ? git(worktreePath, ["log", "-1", "--format=%s", branch]) : "";
  const diff = commitsAhead > 0 ? git(worktreePath, ["diff", `${baseBranch}...${branch}`]) : "";
  return { summary, diff, commitsAhead };
}

/** Merge a review branch into the repository branch, preferring fast-forward. */
export function mergeReviewBranch(repoRoot: string, branch: string): "fast-forward" | "merge-commit" {
  const root = repositoryRoot(repoRoot);
  try {
    git(root, ["merge", "--ff-only", branch]);
    return "fast-forward";
  } catch {
    try {
      git(root, ["merge", "--no-ff", "--no-edit", branch]);
      return "merge-commit";
    } catch (mergeError) {
      try { git(root, ["merge", "--abort"]); } catch {}
      const detail = String(mergeError instanceof Error ? mergeError.message : mergeError).trim();
      throw new Error(`Merge conflict approving ${branch}; merge aborted and both branches were left untouched. Resolve conflicts and retry, or reject with feedback.${detail ? ` Details: ${detail}` : ""}`);
    }
  }
}

function removeWorktreeAndBranch(repoRoot: string, worktreePath: string, branch: string, force: boolean): void {
  const root = repositoryRoot(repoRoot);
  removeWorktree(root, worktreePath, force);
  git(root, ["branch", force ? "-D" : "-d", branch]);
}

/** Remove an approved worktree and its branch after a successful merge. */
export function removeMergedWorktree(repoRoot: string, worktreePath: string, branch: string): void {
  removeWorktreeAndBranch(repoRoot, worktreePath, branch, false);
}

/** Remove an abandoned worktree and force-delete its branch. */
export function removeDiscardedWorktree(repoRoot: string, worktreePath: string, branch: string): void {
  removeWorktreeAndBranch(repoRoot, worktreePath, branch, true);
}
