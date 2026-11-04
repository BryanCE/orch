import { join } from "node:path";
import { branchExists, checkedOutBranch, checkoutSubdirectory, linkedWorktrees, repositoryCommonRoot, runWorktreeCommand } from "./repository.ts";
import { worktreeProvider } from "./registry.ts";
import { errorMessage } from "../util.ts";
import type { AgentWorktree, WorktreeConfig, WorktreeExec, WorktreeProviderId } from "../types/worktree.ts";

/** A launch that wants worktrees: which tool makes them, and how it is configured. */
export interface WorktreeIntent {
  readonly provider: WorktreeProviderId;
  readonly config: WorktreeConfig;
}

/** Where one agent starts, and the worktree it starts in. */
export interface PlacedWorktree {
  readonly cwd: string;
  readonly worktree: AgentWorktree;
}

/**
 * Fork a worktree off whatever is checked out at `from` and name its branch after
 * the agent. A branch left by an earlier agent of this name is refused here, before
 * the tool's own error: it holds work nobody has reviewed.
 */
export function createAgentWorktree(intent: WorktreeIntent, from: string, name: string, exec: WorktreeExec = runWorktreeCommand): PlacedWorktree {
  const root = repositoryCommonRoot(from);
  const base = checkedOutBranch(from);
  const branch = `${intent.config.branch_prefix}${name}`;
  if (branchExists(root, branch)) {
    throw new Error(`Branch ${branch} is left over from an earlier agent. Land it with 'orch review', clear it with 'orch clean --worktrees', or use another name.`);
  }
  const path = worktreeProvider(intent.provider, intent.config, exec).create({ from, root, name, branch, base });
  return { cwd: join(path, checkoutSubdirectory(from)), worktree: { path, branch, base, provider: intent.provider } };
}

/** Undo a worktree this launch made and nothing has run in. Best effort: a leftover
 *  is what `orch clean --worktrees` exists for. */
export function discardFreshWorktree(worktree: AgentWorktree, config: WorktreeConfig, warn: (message: string) => void): void {
  try {
    worktreeProvider(worktree.provider, config).remove({ root: repositoryCommonRoot(worktree.path), worktree: worktree.path, branch: worktree.branch, discard: true });
  } catch (error: unknown) {
    warn(`could not remove ${worktree.path}: ${errorMessage(error)}`);
  }
}

/** Every worktree orch made in a repository, whichever tool made it and wherever
 *  that tool put it: orch's are the ones on a branch under its prefix. */
export function listAgentWorktrees(root: string, branchPrefix: string): string[] {
  return linkedWorktrees(root)
    .filter((worktree) => worktree.branch?.startsWith(branchPrefix) === true)
    .map((worktree) => worktree.path);
}
