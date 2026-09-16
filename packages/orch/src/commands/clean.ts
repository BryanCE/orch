import * as path from "node:path";
import { writeRpc } from "./daemon.ts";
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
import { callerIsSpawnedAgent, die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { Logger } from "../types/core.ts";
import type { Services } from "../types/services.ts";

/** Whether a live agent still runs from this worktree. orchd answers with the
 * resolved paths of every alive agent's worktree; the match is by path alone. */
export function liveWorktreeOwner(worktreePath: string, liveWorktrees: readonly string[]): boolean {
  return liveWorktrees.includes(path.resolve(worktreePath));
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

function cleanWorktrees(liveWorktrees: readonly string[], logger: Logger, force: boolean, json = false): number {
  let repoRoot: string;
  try {
    repoRoot = repositoryCommonRoot(process.cwd());
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const baseBranch = repositoryBranch(repoRoot);
  const worktrees = listAgentWorktrees(repoRoot);
  let reported = false;
  for (const worktreePath of worktrees) {
    if (liveWorktreeOwner(worktreePath, liveWorktrees)) continue;
    reported = cleanOneWorktree(repoRoot, baseBranch, worktreePath, force, logger, json) || reported;
  }
  if (!reported && !json) process.stdout.write("No orphan worktrees to clean.\n");
  return worktrees.length;
}

/** Print malformed presence directories reaped by orchd. */
function removeMalformedAgentDirs(json: boolean, removed: readonly string[]): string[] {
  if (!json) {
    if (removed.length) process.stdout.write("Removed malformed agent dirs:\n" + removed.map((r) => "  " + r).join("\n") + "\n");
    else process.stdout.write("No malformed agent dirs.\n");
  }
  return [...removed];
}

/** Print queued writes closed by orchd. */
function closeDeadAgentWrites(json: boolean, closed: number): number {
  if (!json) process.stdout.write(closed ? `Closed ${closed} queued write(s) to dead agents.\n` : "No queued writes to dead agents.\n");
  return closed;
}

/** Explain why a forced sweep found no dead agents. */
function nothingToReapMessage(liveHolders: readonly string[]): string {
  if (liveHolders.length === 0) return "Nothing to clean - no agent dirs exist.\n";
  return `Nothing to clean - ${liveHolders.length} agent${liveHolders.length === 1 ? " is" : "s are"} live: ${liveHolders.join(", ")}. `
    + `--force reaps DEAD agents only; close them first ('orch close --all'), then retry.\n`;
}

/** Print the forced sweep performed by orchd. */
export function removeDeadAgentDirs(json: boolean, swept: ResultOf<"clean">): string[] {
  if (!json) {
    if (swept.reaped.length) process.stdout.write("Reaped dead agents:\n" + swept.reaped.map((r) => "  " + r).join("\n") + "\n");
    if (swept.removed.length) process.stdout.write("Removed dead agent dirs:\n" + swept.removed.map((r) => "  " + r).join("\n") + "\n");
    if (!swept.reaped.length && !swept.removed.length) process.stdout.write(nothingToReapMessage(swept.liveHolders));
  }
  return [...swept.removed];
}

/** Bare `orch clean` removes only what names no agent and closes writes nobody
 *  will read. Ended agents are history; `--force` is the one way to reap them. */
export async function cmdClean(services: Services, args: string[]): Promise<void> {
  // A sweep reaps records and worktrees the caller does not own, which is
  // destructive maintenance: the user's or the pack orch's call, never a
  // slave's. It refuses before reading anything, so nothing is mutated.
  if (callerIsSpawnedAgent(services.orchDir)) die("orch clean is operator-only: a spawned agent never reaps records it does not own. Ask the user or your orch to run it.");
  const { flags, positional } = parseCommand("clean", args);
  if (positional.length > 0) die("usage: orch clean [--force] [--worktrees] [--json]");
  const json = flags.has("--json");
  const force = flags.has("--force");
  const swept = await writeRpc(services, "clean", { force });
  const malformed = removeMalformedAgentDirs(json, swept.malformed);
  const closed = closeDeadAgentWrites(json, swept.closed);
  const removed = force ? removeDeadAgentDirs(json, swept) : [];
  const worktrees = flags.has("--worktrees") ? cleanWorktrees(swept.liveWorktrees, services.logger, force, json) : 0;
  if (json) process.stdout.write(JSON.stringify({ malformed, closed, removed, worktrees }) + "\n");
}

