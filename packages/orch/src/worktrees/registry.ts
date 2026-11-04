import { gitWorktrees } from "./git.ts";
import { worktrunkWorktrees } from "./worktrunk.ts";
import { runWorktreeCommand } from "./repository.ts";
import type { WorktreeConfig, WorktreeExec, WorktreeProvider, WorktreeProviderId } from "../types/worktree.ts";

const PROVIDERS: Readonly<Record<WorktreeProviderId, (config: WorktreeConfig, exec: WorktreeExec) => WorktreeProvider>> = {
  git: gitWorktrees,
  worktrunk: worktrunkWorktrees,
};

/** The one way core reaches a worktree provider. */
export function worktreeProvider(id: WorktreeProviderId, config: WorktreeConfig, exec: WorktreeExec = runWorktreeCommand): WorktreeProvider {
  return PROVIDERS[id](config, exec);
}
