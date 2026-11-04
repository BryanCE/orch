import { join } from "node:path";
import { errorMessage } from "../util.ts";
import { linkedWorktrees } from "./repository.ts";
import type { WorktreeConfig, WorktreeCreateRequest, WorktreeExec, WorktreeLandRequest, WorktreeLanding, WorktreeProvider, WorktreeRemoveRequest } from "../types/worktree.ts";

function validName(name: string): string {
  if (!name || name === "." || name === ".." || /[\\/]/.test(name)) throw new Error(`Invalid worktree name: ${name}`);
  return name;
}

/** Plain `git worktree`, in a directory orch keeps under the repository root. */
export function gitWorktrees(config: WorktreeConfig, exec: WorktreeExec): WorktreeProvider {
  const git = (directory: string, args: readonly string[]): string =>
    exec("git", ["-C", directory, ...args], config.timeout_ms);

  /** Merge inside the checkout that holds the base, so that checkout stays current. */
  const mergeIn = (checkout: string, { branch }: WorktreeLandRequest): WorktreeLanding => {
    try {
      git(checkout, ["merge", "--ff-only", branch]);
      return "fast-forward";
    } catch {
      try {
        git(checkout, ["merge", "--no-ff", "--no-edit", branch]);
        return "merge-commit";
      } catch (mergeError: unknown) {
        try { git(checkout, ["merge", "--abort"]); } catch { /* the merge never started */ }
        throw new Error(`Merge conflict approving ${branch}; merge aborted and both branches were left untouched. Resolve conflicts and retry, or reject with feedback. Details: ${errorMessage(mergeError).trim()}`);
      }
    }
  };

  /** A base no checkout holds can only move forward, and moving it touches no files. */
  const fastForward = ({ root, branch, base }: WorktreeLandRequest): WorktreeLanding => {
    try {
      git(root, ["fetch", ".", `${branch}:${base}`]);
      return "fast-forward";
    } catch (error: unknown) {
      throw new Error(`${base} is checked out nowhere and ${branch} does not fast-forward it. Check ${base} out and retry. Details: ${errorMessage(error).trim()}`);
    }
  };

  return {
    id: "git",
    repositoryDirectory: config.directory,
    isAvailable: () => true,
    create: ({ root, name, branch, base }: WorktreeCreateRequest): string => {
      const path = join(root, config.directory, validName(name));
      git(root, ["worktree", "add", "-b", branch, path, base]);
      return path;
    },
    land: (request: WorktreeLandRequest): WorktreeLanding => {
      const checkout = linkedWorktrees(request.root, exec).find((worktree) => worktree.branch === request.base);
      return checkout === undefined ? fastForward(request) : mergeIn(checkout.path, request);
    },
    remove: ({ root, worktree, branch, discard }: WorktreeRemoveRequest): void => {
      git(root, ["worktree", "remove", ...(discard ? ["--force"] : []), worktree]);
      git(root, ["branch", discard ? "-D" : "-d", branch]);
    },
  };
}
