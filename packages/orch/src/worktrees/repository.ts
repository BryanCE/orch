import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { WorktreeExec } from "../types/worktree.ts";

/** What a git repository says about itself. Nothing here changes one. */

export const runWorktreeCommand: WorktreeExec = (file, args, timeoutMs) =>
  execFileSync(file, [...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...(timeoutMs === undefined ? {} : { timeout: timeoutMs }) }).trim();

function git(directory: string, args: readonly string[]): string {
  return runWorktreeCommand("git", ["-C", directory, ...args]);
}

/** The main repository behind one `.git` file. A submodule's has no `commondir`
 *  and stands for itself, which is what its directory is. */
function linkedRoot(directory: string, marker: string): string {
  const gitdir = /^gitdir:\s*(.+)$/m.exec(readFileSync(marker, "utf8"))?.[1]?.trim();
  if (gitdir === undefined) return directory;
  const privateDir = resolve(directory, gitdir);
  const commondir = join(privateDir, "commondir");
  if (!existsSync(commondir)) return directory;
  return dirname(resolve(privateDir, readFileSync(commondir, "utf8").trim()));
}

/**
 * The main root of the repository `directory` sits in, or null outside one. Every
 * linked worktree answers with the same root.
 *
 * Walked rather than shelled out to `git rev-parse`: this runs on every peer
 * resolution, and a subprocess per check is not affordable there.
 */
export function repositoryRootOf(directory: string): string | null {
  let current = resolve(directory);
  for (;;) {
    const marker = join(current, ".git");
    if (existsSync(marker)) return statSync(marker).isFile() ? linkedRoot(current, marker) : current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** The main repository root shared by every linked worktree. Throws outside one. */
export function repositoryCommonRoot(directory: string): string {
  const root = existsSync(directory) ? repositoryRootOf(directory) : null;
  if (root === null) throw new Error(`Worktree mode requires a git repository: ${directory}`);
  return root;
}

/** The branch checked out at `directory`. Throws on a detached HEAD: nothing can land there. */
export function checkedOutBranch(directory: string): string {
  const branch = git(directory, ["branch", "--show-current"]);
  if (!branch) throw new Error(`Worktree mode requires a branch; HEAD is detached at ${directory}`);
  return branch;
}

export function branchExists(root: string, branch: string): boolean {
  return git(root, ["branch", "--list", branch]) !== "";
}

/** The top of the checkout `directory` sits in, which a linked worktree has its own of. */
export function checkoutRoot(directory: string): string {
  return realpathSync(git(directory, ["rev-parse", "--show-toplevel"]));
}

/** Where `directory` sits inside its own checkout, so an agent launched from a
 *  package starts in that package of its worktree. */
export function checkoutSubdirectory(directory: string): string {
  const inside = relative(checkoutRoot(directory), realpathSync(directory));
  return inside.startsWith(`..${sep}`) ? "" : inside;
}

export interface LinkedWorktree {
  readonly path: string;
  /** Null on a detached HEAD. */
  readonly branch: string | null;
}

const BRANCH_REF = "branch refs/heads/";

/** Every checkout of a repository, as `git worktree list --porcelain` states them. */
export function linkedWorktrees(root: string, exec: WorktreeExec = runWorktreeCommand): LinkedWorktree[] {
  return exec("git", ["-C", root, "worktree", "list", "--porcelain"]).split(/\r?\n\r?\n/).flatMap((block) => {
    const lines = block.split(/\r?\n/);
    const path = lines.find((line) => line.startsWith("worktree "))?.slice("worktree ".length);
    if (path === undefined) return [];
    return [{ path, branch: lines.find((line) => line.startsWith(BRANCH_REF))?.slice(BRANCH_REF.length) ?? null }];
  });
}

/** Whether a branch has commits its base does not. */
export function worktreeHasCommitsAheadOf(worktree: string, base: string): boolean {
  return Number(git(worktree, ["rev-list", "--count", `${base}..HEAD`])) > 0;
}

export function worktreeHasChanges(worktree: string): boolean {
  return git(worktree, ["status", "--porcelain"]) !== "";
}

/** A compact summary and diff for a branch under review. */
export function worktreeReviewSummary(worktree: string, base: string, branch: string): { summary: string; diff: string; commitsAhead: number } {
  const commitsAhead = Number(git(worktree, ["rev-list", "--count", `${base}..${branch}`]));
  const summary = commitsAhead > 0 ? git(worktree, ["log", "-1", "--format=%s", branch]) : "";
  const diff = commitsAhead > 0 ? git(worktree, ["diff", `${base}...${branch}`]) : "";
  return { summary, diff, commitsAhead };
}
