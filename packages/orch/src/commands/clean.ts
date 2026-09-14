import * as path from "node:path";
import { closeOutboxForDeadTargets, loadPresence, reapDeadPresenceDirs, reapMalformedPresenceDirs, spawnedRecords } from "../presence/store.ts";
import { presenceAgentDir } from "../presence/history.ts";
import { isAgentId } from "../backends/identity.ts";
import { livePresenceHolders } from "../store/connection.ts";
import { errorMessage } from "../util.ts";
import {
  listAgentWorktrees,
  removeDiscardedWorktree,
  removeMergedWorktree,
  repositoryBranch,
  repositoryCommonRoot,
  worktreeBranch,
  worktreeHasChanges,
  worktreeHasCommitsAheadOf,
} from "../worktree.ts";
import { callerIsSpawnedAgent, die, presenceById } from "./target.ts";
import type { AgentView } from "../types/store.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { Services } from "../types/services.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { DeadAgentSweepOptions } from "../types/command.ts";

/** Whether a live agent still runs from this worktree.
 *
 *  A1: the worktree is one ENVIRONMENT axis of an agent, and the agent it
 *  belongs to is found by its minted id — never by a pane, which is a different
 *  axis and can change without the worktree changing at all. `presence` is keyed
 *  by that same id.
 */
export function liveWorktreeOwner(
  worktreePath: string,
  views: readonly AgentView[],
  presence: ReadonlyMap<string, PresenceEntry>,
): boolean {
  const owner = views.find((view) => view.environment.worktree !== null
    && path.resolve(view.environment.worktree) === path.resolve(worktreePath));
  return Boolean(owner && presence.get(owner.id)?.alive);
}

function cleanOneWorktree(repoRoot: string, baseBranch: string, worktreePath: string, force: boolean, logger: Logger, json = false): boolean {
  try {
    const branch = worktreeBranch(worktreePath);
    const hasCommitsAhead = worktreeHasCommitsAheadOf(repoRoot, worktreePath, baseBranch);
    const hasChanges = worktreeHasChanges(worktreePath);
    const discardReason = [hasCommitsAhead ? "unmerged commits" : "", hasChanges ? "uncommitted changes" : ""]
      .filter(Boolean).join(" and ");
    if (!hasCommitsAhead && !hasChanges) {
      removeMergedWorktree(repoRoot, worktreePath, branch);
      if (!json) process.stdout.write(`Removed orphan worktree ${worktreePath} (${branch}; empty or merged).\n`);
    } else if (!force) {
      if (!json) process.stdout.write(`Kept orphan worktree ${worktreePath} (${branch}; ${discardReason}). Re-run with --force to discard it.\n`);
    } else {
      removeDiscardedWorktree(repoRoot, worktreePath, branch);
      if (!json) process.stdout.write(`Removed orphan worktree ${worktreePath} (${branch}); discarded ${discardReason}.\n`);
    }
  } catch (error: unknown) {
    const message = errorMessage(error);
    logger.error("clean.worktree-failed", { path: worktreePath, error: message });
    process.stdout.write(`failed to clean worktree ${worktreePath}: ${message}\n`);
  }
  return true;
}

function cleanWorktrees(root: OrchDir, logger: Logger, force: boolean, json = false): number {
  let repoRoot: string;
  try {
    repoRoot = repositoryCommonRoot(process.cwd());
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const baseBranch = repositoryBranch(repoRoot);
  const views = [...spawnedRecords(root).values()];
  const presence = presenceById(loadPresence(root));
  const worktrees = listAgentWorktrees(repoRoot);
  let reported = false;
  for (const worktreePath of worktrees) {
    if (liveWorktreeOwner(worktreePath, views, presence)) continue;
    reported = cleanOneWorktree(repoRoot, baseBranch, worktreePath, force, logger, json) || reported;
  }
  if (!reported && !json) process.stdout.write("No orphan worktrees to clean.\n");
  return worktrees.length;
}

function validateCleanArgs(args: string[]): { worktrees: boolean; force: boolean } {
  const worktrees = args.includes("--worktrees");
  const force = args.includes("--force");
  if (args.some((arg) => arg !== "--worktrees" && arg !== "--force"))
    die("usage: orch clean [--force] [--worktrees]");
  return { worktrees, force };
}

/** Remove the presence directories that name no agent; the store owns the removal,
 *  this command adds output. */
function removeMalformedAgentDirs(json = false, root: OrchDir): string[] {
  const removed = reapMalformedPresenceDirs(root);
  if (!json) {
    if (removed.length) process.stdout.write("Removed malformed agent dirs:\n" + removed.map((r) => "  " + r).join("\n") + "\n");
    else process.stdout.write("No malformed agent dirs.\n");
  }
  return removed;
}

/** Close the queued writes no live agent will ever read; the store owns the rows,
 *  this command adds output. */
function closeDeadAgentWrites(json = false, root: OrchDir): number {
  const closed = closeOutboxForDeadTargets(root);
  if (!json) process.stdout.write(closed ? `Closed ${closed} queued write(s) to dead agents.\n` : "No queued writes to dead agents.\n");
  return closed;
}

/** Reap dead presence through the same spawned/ownership cleanup path as daemon
 *  retention. The presence store owns the directory and database cleanup; this
 *  command adds output. */
/**
 * Why a reap removed nothing. `--force` reaps DEAD agents, so a live fleet leaves
 * it with nothing in scope — and saying only "every dir belongs to a live process"
 * left the user to work out that their own agents were the reason and that closing
 * is the fix. The store's rebuild refusal already says exactly that, from the same
 * `livePresenceHolders` list, so this says it the same way rather than inventing a
 * second wording for one situation.
 */
function nothingToReapMessage(root: OrchDir): string {
  const holders = livePresenceHolders(root);
  if (holders.length === 0) return "Nothing to clean - no agent dirs exist.\n";
  return `Nothing to clean - ${holders.length} agent${holders.length === 1 ? " is" : "s are"} live: ${holders.join(", ")}. `
    + `--force reaps DEAD agents only; close them first ('orch close --all'), then retry.\n`;
}

export function removeDeadAgentDirs(services: Services, json: boolean, options: DeadAgentSweepOptions & { root: OrchDir }): string[] {
  const result = reapDeadPresenceDirs(options.root, options.olderThan);
  for (const failure of result.failed) {
    const message = errorMessage(failure.error);
    const log = isAgentId(failure.entry.key) ? services.logger.forAgent(failure.entry.key) : services.logger;
    const directory = presenceAgentDir(failure.entry.key, options.root);
    log.error("clean.presence-remove-failed", { path: directory, error: message });
    process.stdout.write(`failed to remove ${directory}: ${message}\n`);
  }
  const removed = result.removed.map((entry) => entry.key);
  if (!json) {
    if (removed.length) process.stdout.write("Removed dead agent dirs:\n" + removed.map((r) => "  " + r).join("\n") + "\n");
    else process.stdout.write(nothingToReapMessage(options.root));
  }
  return removed;
}

/** Bare `orch clean` removes only what names no agent and closes writes nobody
 *  will read. Ended agents are history; `--force` is the one way to reap them. */
export function cmdClean(services: Services, args: string[]) {
  // A sweep reaps records and worktrees the caller does not own, which is
  // destructive maintenance: the user's or the pack orch's call, never a
  // slave's. It refuses before reading anything, so nothing is mutated.
  if (callerIsSpawnedAgent(services.orchDir)) die("orch clean is operator-only: a spawned agent never reaps records it does not own. Ask the user or your orch to run it.");
  const json = args.includes("--json");
  const options = validateCleanArgs(args.filter((arg) => arg !== "--json"));
  const malformed = removeMalformedAgentDirs(json, services.orchDir);
  const closed = closeDeadAgentWrites(json, services.orchDir);
  const removed = options.force ? removeDeadAgentDirs(services, json, { root: services.orchDir }) : [];
  const worktrees = options.worktrees ? cleanWorktrees(services.orchDir, services.logger, options.force, json) : 0;
  if (json) process.stdout.write(JSON.stringify({ malformed, closed, removed, worktrees }) + "\n");
}

