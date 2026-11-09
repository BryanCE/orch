// The sweep `orch clean` asks for, run by orchd: every row and every presence directory is
// reaped here, and so are the orphan worktrees of the repository the command names.
import * as path from "node:path";
import { closeOutboxForDeadTargets, loadPresence, reapDeadAgentRecords, reapExpiredPresenceDirs, reapMalformedPresenceDirs, spawnedRecords } from "../../../presence/store.ts";
import { livePresenceHolders } from "../../../store/connection.ts";
import { worktreeOf } from "../../../store/agent-rows.ts";
import { hereAgents } from "../../../process-place.ts";
import { listAgentWorktrees } from "../../../worktrees/agent.ts";
import { checkedOutBranch, repositoryCommonRoot, worktreeHasChanges, worktreeHasCommitsAheadOf } from "../../../worktrees/repository.ts";
import { worktreeProvider } from "../../../worktrees/registry.ts";
import { errorMessage } from "../../../util.ts";
import type { Logger, OrchDir } from "../../../types/core.ts";
import type { WorktreeConfig, WorktreeProvider } from "../../../types/worktree.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import { notDead } from "../../../types/presence.ts";

type WorktreesCleaned = NonNullable<ResultOf<"clean">["worktrees"]>;
type WorktreeCleaned = Extract<WorktreesCleaned, { cleaned: unknown }>["cleaned"][number];

/** The resolved worktree paths of every agent here still alive: the ones a clean leaves in
 *  place. A worktree is a directory on this machine, so only an agent placed here has one. */
function liveWorktreePaths(directory: OrchDir): string[] {
  const presence = loadPresence(directory);
  const live = [...spawnedRecords(directory).values()].filter((view) => notDead(presence.get(view.id))).map((view) => view.id);
  return hereAgents(directory, live).flatMap((agent) => {
    const worktree = worktreeOf(directory, agent);
    return worktree === null ? [] : [path.resolve(worktree.path)];
  });
}

/** Whether a live agent still runs from this worktree. The match is by resolved path alone. */
export function liveWorktreeOwner(worktreePath: string, liveWorktrees: readonly string[]): boolean {
  return liveWorktrees.includes(path.resolve(worktreePath));
}

/** One orphan: removed when it holds nothing, kept when it holds work, or discarded with `all`. */
function cleanOneWorktree(provider: WorktreeProvider, root: string, baseBranch: string, worktree: string, all: boolean, logger: Logger): WorktreeCleaned {
  let branch: string | null = null;
  try {
    branch = checkedOutBranch(worktree);
    const held = [
      worktreeHasCommitsAheadOf(worktree, baseBranch) ? "unmerged commits" : "",
      worktreeHasChanges(worktree) ? "uncommitted changes" : "",
    ].filter(Boolean).join(" and ");
    if (!held) {
      provider.remove({ root, worktree, branch, discard: false });
      return { path: worktree, branch, outcome: "removed", reason: null };
    }
    if (!all) return { path: worktree, branch, outcome: "kept", reason: held };
    provider.remove({ root, worktree, branch, discard: true });
    return { path: worktree, branch, outcome: "discarded", reason: held };
  } catch (error: unknown) {
    const message = errorMessage(error);
    logger.error("clean.worktree-failed", { path: worktree, error: message });
    return { path: worktree, branch, outcome: "failed", reason: message };
  }
}

/** The orphan worktrees of the repository `from` sits in. An orphan has no record to name its
 *  tool, so the one configured now removes it. */
function cleanWorktrees(directory: OrchDir, config: WorktreeConfig, from: string, all: boolean, logger: Logger): WorktreesCleaned {
  let root: string;
  try {
    root = repositoryCommonRoot(from);
  } catch (error: unknown) {
    return { refused: errorMessage(error) };
  }
  const baseBranch = checkedOutBranch(root);
  const worktrees = listAgentWorktrees(root, config.branch_prefix);
  const provider = worktreeProvider(config.provider, config);
  const live = liveWorktreePaths(directory);
  const cleaned = worktrees
    .filter((worktree) => !liveWorktreeOwner(worktree, live))
    .map((worktree) => cleanOneWorktree(provider, root, baseBranch, worktree, all, logger));
  return { found: worktrees.length, cleaned };
}

/** Bare clean removes what names no agent and closes writes nobody will read.
 *  `all` is the operator's "now": every dead agent's rows and history go at once. */
export function cleanStore(directory: OrchDir, config: WorktreeConfig, logger: Logger, params: ParamsOf<"clean">): ResultOf<"clean"> {
  const malformed = reapMalformedPresenceDirs(directory);
  const closed = closeOutboxForDeadTargets(directory);
  const reaped = params.all ? reapDeadAgentRecords(directory) : [];
  const removed = params.all ? reapExpiredPresenceDirs(directory, new Date()) : [];
  const live = livePresenceHolders(directory);
  const worktrees = params.worktreesIn === null ? null : cleanWorktrees(directory, config, params.worktreesIn, params.all, logger);
  return { malformed, closed, reaped, removed, liveHolders: [...live.workers, ...live.registered], worktrees };
}
