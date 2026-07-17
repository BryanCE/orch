import * as files from "node:fs";
import * as path from "node:path";
import { loadPresence, spawnedRecords, type PresenceEntry, type SpawnedRecord } from "../store.ts";
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
import { die } from "./target.ts";

function liveWorktreeOwner(worktreePath: string, records: Map<string, SpawnedRecord>, presence: Map<string, PresenceEntry>): boolean {
  const owner = [...records.values()].find((record) =>
    record.worktree && path.resolve(record.worktree) === path.resolve(worktreePath));
  return Boolean(owner && presence.get(owner.pane)?.alive);
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
    process.stderr.write(`failed to clean worktree ${worktreePath}: ${errorMessage(error)}\n`);
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
  const records = spawnedRecords();
  const presence = loadPresence();
  const worktrees = listAgentWorktrees(repoRoot);
  let reported = false;
  for (const worktreePath of worktrees) {
    if (liveWorktreeOwner(worktreePath, records, presence)) continue;
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

export function removeDeadAgentDirs(json = false): string[] {
  const removed: string[] = [];
  for (const e of loadPresence().values()) {
    if (!e.alive) {
      try {
        files.rmSync(e.dir, { recursive: true, force: true });
        removed.push(`${e.key} (pid ${e.status?.pid ?? "?"})`);
      } catch (err: unknown) {
        process.stderr.write(`failed to remove ${e.dir}: ${errorMessage(err)}\n`);
      }
    }
  }
  if (!json) {
    if (removed.length) process.stdout.write("Removed dead agent dirs:\n" + removed.map((r) => "  " + r).join("\n") + "\n");
    else process.stdout.write("Nothing to clean — all agent dirs have live pids (or none exist).\n");
  }
  return removed;
}

export function cmdClean(args: string[]) {
  const json = args.includes("--json");
  const options = validateCleanArgs(args.filter((arg) => arg !== "--json"));
  const removed = removeDeadAgentDirs(json);
  const worktrees = options.worktrees ? cleanWorktrees(options.force, json) : 0;
  if (json) process.stdout.write(JSON.stringify({ removed, worktrees }) + "\n");
}

