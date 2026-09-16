// The store's own sweep, run by orchd. The command adds output and the git
// work; every row and every presence directory is reaped here.
import * as path from "node:path";
import { closeOutboxForDeadTargets, loadPresence, reapDeadAgentRecords, reapExpiredPresenceDirs, reapMalformedPresenceDirs, spawnedRecords } from "../../../presence/store.ts";
import { livePresenceHolders } from "../../../store/connection.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

/** The resolved worktree paths of every agent still alive: the ones `orch clean
 *  --worktrees` must leave in place. */
function liveWorktreePaths(directory: OrchDir): string[] {
  const presence = loadPresence(directory);
  return [...spawnedRecords(directory).values()]
    .filter((view) => view.environment.worktree !== null && presence.get(view.id)?.alive === true)
    .map((view) => path.resolve(view.environment.worktree!));
}

/** Bare clean removes what names no agent and closes writes nobody will read.
 *  `force` is the operator's "now": every dead agent's rows and history go at once. */
export function cleanStore(directory: OrchDir, params: ParamsOf<"clean">): ResultOf<"clean"> {
  const malformed = reapMalformedPresenceDirs(directory);
  const closed = closeOutboxForDeadTargets(directory);
  const reaped = params.force ? reapDeadAgentRecords(directory) : [];
  const removed = params.force ? reapExpiredPresenceDirs(directory, new Date()) : [];
  const live = livePresenceHolders(directory);
  return { malformed, closed, reaped, removed, liveHolders: [...live.workers, ...live.sessions], liveWorktrees: liveWorktreePaths(directory) };
}
