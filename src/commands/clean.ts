import * as path from "node:path";
import { orchDir, reapDeadPresenceDirs } from "../presence/store.ts";
import { errorMessage } from "../util.ts";
import { tryParseIdentity } from "../backends/identity.ts";
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
import { agentViewIndex, callerIsSpawnedAgent, die, presenceById } from "./target.ts";
import { commandLogger } from "./logging.ts";
import type { AgentView } from "../types/store.ts";
import type { PresenceEntry } from "../types/presence.ts";

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

function cleanOneWorktree(repoRoot: string, baseBranch: string, worktreePath: string, force: boolean, json = false): boolean {
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
    commandLogger().error("clean.worktree-failed", { path: worktreePath, error: message });
    process.stderr.write(`failed to clean worktree ${worktreePath}: ${message}\n`);
  }
  return true;
}

function cleanWorktrees(force: boolean, json = false): number {
  let repoRoot: string;
  try {
    repoRoot = repositoryCommonRoot(process.cwd());
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const baseBranch = repositoryBranch(repoRoot);
  const views = [...agentViewIndex().values()];
  const presence = presenceById();
  const worktrees = listAgentWorktrees(repoRoot);
  let reported = false;
  for (const worktreePath of worktrees) {
    if (liveWorktreeOwner(worktreePath, views, presence)) continue;
    reported = cleanOneWorktree(repoRoot, baseBranch, worktreePath, force, json) || reported;
  }
  if (!reported && !json) process.stdout.write("No orphan worktrees to clean.\n");
  return worktrees.length;
}

function validateCleanArgs(args: string[]): { worktrees: boolean; force: boolean } {
  const worktrees = args.includes("--worktrees");
  const force = args.includes("--force");
  if (args.some((arg) => arg !== "--worktrees" && arg !== "--force") || (force && !worktrees))
    die("usage: orch clean [--worktrees [--force]]");
  return { worktrees, force };
}

export interface DeadAgentSweepOptions {
  /** Root to inspect; omitted for the operator's configured ORCH_DIR. */
  root?: string;
  /** Only reap directories whose mtime is before this cutoff. */
  olderThan?: Date;
}

/** Reap dead presence through the same spawned/ownership cleanup path as orch clean.
 * The presence store owns the directory and database cleanup; this command adds output. */
export function removeDeadAgentDirs(json = false, options: DeadAgentSweepOptions = {}): string[] {
  const result = reapDeadPresenceDirs(options.root ?? orchDir(), options.olderThan);
  for (const failure of result.failed) {
    const message = errorMessage(failure.error);
    const identity = tryParseIdentity(failure.entry.key);
    const log = identity ? commandLogger().forAgent(identity.id) : commandLogger();
    log.error("clean.presence-remove-failed", { path: failure.entry.dir, error: message });
    process.stderr.write(`failed to remove ${failure.entry.dir}: ${message}\n`);
  }
  const removed = result.removed.map((entry) => `${entry.key} (pid ${entry.status?.pid ?? "?"})`);
  if (!json) {
    if (removed.length) process.stdout.write("Removed dead agent dirs:\n" + removed.map((r) => "  " + r).join("\n") + "\n");
    else process.stdout.write("Nothing to clean - all agent dirs have live pids (or none exist).\n");
  }
  return removed;
}

export function cmdClean(args: string[]) {
  // A sweep reaps records and worktrees the caller does not own, which is
  // destructive maintenance: the user's or the pack orch's call, never a
  // slave's. It refuses before reading anything, so nothing is mutated.
  if (callerIsSpawnedAgent()) die("orch clean is operator-only: a spawned agent never reaps records it does not own. Ask the user or your orch to run it.");
  const json = args.includes("--json");
  const options = validateCleanArgs(args.filter((arg) => arg !== "--json"));
  const removed = removeDeadAgentDirs(json);
  const worktrees = options.worktrees ? cleanWorktrees(options.force, json) : 0;
  if (json) process.stdout.write(JSON.stringify({ removed, worktrees }) + "\n");
}

