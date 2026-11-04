import { z } from "zod";
import { binaryOnPath, errorMessage } from "../util.ts";
import type { WorktreeConfig, WorktreeCreateRequest, WorktreeExec, WorktreeLandRequest, WorktreeLanding, WorktreeProvider, WorktreeRemoveRequest } from "../types/worktree.ts";

const switchReplySchema = z.object({ path: z.string().min(1) });
const mergeReplySchema = z.object({ rebased: z.boolean() });

/**
 * Worktrunk. Its `worktree-path` template picks the location and its project hooks
 * run on create, merge and remove, which is the reason to choose it.
 *
 * `--yes` because no human answers a prompt here: a spawn has no stdin to ask on.
 * Merges keep the agent's commits: without an LLM configured for it, worktrunk
 * squashes them under a message that says nothing.
 */
export function worktrunkWorktrees(config: WorktreeConfig, exec: WorktreeExec): WorktreeProvider {
  const worktrunk = (directory: string, args: readonly string[]): string =>
    exec(config.worktrunk_command, ["-C", directory, ...args, "--yes", "--format", "json"], config.timeout_ms);

  return {
    id: "worktrunk",
    repositoryDirectory: null,
    isAvailable: () => binaryOnPath(config.worktrunk_command),
    create: ({ from, branch, base }: WorktreeCreateRequest): string =>
      switchReplySchema.parse(JSON.parse(worktrunk(from, ["switch", "--create", branch, "--base", base, "--no-cd"]))).path,
    land: ({ worktree, branch, base }: WorktreeLandRequest): WorktreeLanding => {
      try {
        const reply = mergeReplySchema.parse(JSON.parse(worktrunk(worktree, ["merge", base, "--no-squash", "--no-remove"])));
        return reply.rebased ? "rebase" : "fast-forward";
      } catch (error: unknown) {
        // Worktrunk stops mid-rebase on a conflict and leaves that in the worktree.
        try { exec("git", ["-C", worktree, "rebase", "--abort"], config.timeout_ms); } catch { /* no rebase to abort */ }
        throw new Error(`Could not land ${branch} on ${base}; both branches were left untouched. Resolve conflicts and retry, or reject with feedback. Details: ${errorMessage(error).trim()}`);
      }
    },
    remove: ({ root, branch, discard }: WorktreeRemoveRequest): void => {
      worktrunk(root, ["remove", branch, "--foreground", ...(discard ? ["--force", "--force-delete"] : [])]);
    },
  };
}
