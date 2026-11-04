import { z } from "zod";
import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import { binaryPath, errorMessage } from "../util.ts";
import type { WorktreeConfig, WorktreeCreateRequest, WorktreeExec, WorktreeLandRequest, WorktreeLanding, WorktreeProvider, WorktreeProvisionRequest, WorktreeRemoveRequest } from "../types/worktree.ts";

const switchReplySchema = z.object({ path: z.string().min(1) });
const mergeReplySchema = z.object({ rebased: z.boolean() });

/** On Windows `wt` is Windows Terminal, and running it opens a window. */
const WINDOWS_TERMINAL = /[\\/]WindowsApps[\\/]/i;

/** One configured entry as argv. A whole entry that is a file is a path, spaces and all. */
function commandWords(entry: string): readonly string[] {
  return existsSync(entry) ? [entry] : entry.trim().split(/\s+/);
}

function runnable(argv: readonly string[]): boolean {
  const [binary] = argv;
  if (binary === undefined) return false;
  if (isAbsolute(binary)) return existsSync(binary);
  const found = binaryPath(binary);
  return found !== null && !WINDOWS_TERMINAL.test(found);
}

/** How to run worktrunk: its own override, else the first configured entry that resolves.
 *  Looked up rather than typed into a shell, because an alias or a shell function
 *  exists only in the shell that defined it. Null asks the user to say. */
function installedCommand(config: WorktreeConfig): readonly string[] | null {
  const override = process.env.WORKTRUNK_BIN;
  if (override) return [override];
  return config.worktrunk_commands.map(commandWords).find(runnable) ?? null;
}

function missingReason(config: WorktreeConfig): string {
  return `could not find worktrunk: tried ${config.worktrunk_commands.join(", ")}. A shell alias is invisible to orch; say what to run with: orch settings worktrees.worktrunk_commands '["<command>"]'`;
}

/**
 * Worktrunk. Its `worktree-path` template picks the location and its project hooks
 * run on create, merge and remove, which is the reason to choose it.
 *
 * `--yes` because no human answers a prompt here: a spawn has no stdin to ask on.
 * Merges keep the agent's commits: without an LLM configured for it, worktrunk
 * squashes them under a message that says nothing.
 */
export function worktrunkWorktrees(config: WorktreeConfig, exec: WorktreeExec): WorktreeProvider {
  const worktrunk = (directory: string, args: readonly string[]): string => {
    const command = installedCommand(config);
    if (command === null) throw new Error(missingReason(config));
    const [binary, ...leading] = command;
    if (binary === undefined) throw new Error(missingReason(config));
    return exec(binary, [...leading, "-C", directory, ...args, "--yes", "--format", "json"], config.timeout_ms);
  };

  return {
    id: "worktrunk",
    repositoryDirectory: null,
    unavailable: () => installedCommand(config) === null ? missingReason(config) : null,
    create: ({ from, branch, base }: WorktreeCreateRequest): string =>
      switchReplySchema.parse(JSON.parse(worktrunk(from, ["switch", "--create", branch, "--base", base, "--no-cd"]))).path,
    // `--require-include` keeps a repository with no `.worktreeinclude` from copying
    // every gitignored file it has; worktrunk answers that case with an empty copy.
    provision: ({ worktree, base }: WorktreeProvisionRequest): void => {
      worktrunk(worktree, ["step", "copy-ignored", "--from", base, "--require-include"]);
    },
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
