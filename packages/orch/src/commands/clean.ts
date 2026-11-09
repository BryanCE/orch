import { writeRpc } from "./daemon.ts";
import { die } from "./target.ts";
import { whoAmI } from "./self.ts";
import { parseCommand } from "./registry.ts";
import { usageError } from "../cli/usage.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { Services } from "../types/services.ts";

type WorktreesCleaned = NonNullable<ResultOf<"clean">["worktrees"]>;
type WorktreeCleaned = Extract<WorktreesCleaned, { cleaned: unknown }>["cleaned"][number];

/** What orchd did with one orphan worktree, as a line. */
function worktreeLine(worktree: WorktreeCleaned): string {
  const branch = worktree.branch ?? "no branch";
  switch (worktree.outcome) {
    case "removed": return `Removed orphan worktree ${worktree.path} (${branch}; empty or merged).\n`;
    case "kept": return `Kept orphan worktree ${worktree.path} (${branch}; ${worktree.reason ?? ""}). Re-run with --all to discard it.\n`;
    case "discarded": return `Removed orphan worktree ${worktree.path} (${branch}); discarded ${worktree.reason ?? ""}.\n`;
    case "failed": return `failed to clean worktree ${worktree.path}: ${worktree.reason ?? ""}\n`;
    default: {
      const exhaustive: never = worktree.outcome;
      throw new Error(`unknown worktree outcome ${String(exhaustive)}`);
    }
  }
}

/** Print the orphan worktrees orchd cleaned; how many orch made in the repository. A failure is
 *  printed even under --json, as it always was. */
function reportWorktrees(worktrees: WorktreesCleaned, json: boolean): number {
  if ("refused" in worktrees) die(worktrees.refused);
  for (const worktree of worktrees.cleaned) {
    if (!json || worktree.outcome === "failed") process.stdout.write(worktreeLine(worktree));
  }
  if (worktrees.cleaned.length === 0 && !json) process.stdout.write("No orphan worktrees to clean.\n");
  return worktrees.found;
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

/** Explain why a `--all` sweep found no dead agents. */
function nothingToReapMessage(liveHolders: readonly string[]): string {
  if (liveHolders.length === 0) return "Nothing to clean - no agent dirs exist.\n";
  return `Nothing to clean - ${liveHolders.length} agent${liveHolders.length === 1 ? " is" : "s are"} live: ${liveHolders.join(", ")}. `
    + `--all reaps DEAD agents only; close them first ('orch close --all'), then retry.\n`;
}

/** Print the `--all` sweep performed by orchd. */
function removeDeadAgentDirs(json: boolean, swept: ResultOf<"clean">): string[] {
  if (!json) {
    if (swept.reaped.length) process.stdout.write("Reaped dead agents:\n" + swept.reaped.map((r) => "  " + r).join("\n") + "\n");
    if (swept.removed.length) process.stdout.write("Removed dead agent dirs:\n" + swept.removed.map((r) => "  " + r).join("\n") + "\n");
    if (!swept.reaped.length && !swept.removed.length) process.stdout.write(nothingToReapMessage(swept.liveHolders));
  }
  return [...swept.removed];
}

/** Bare `orch clean` removes only what names no agent and closes writes nobody
 *  will read. Ended agents are history; `--all` is the one way to reap them. */
export async function cmdClean(services: Services, args: string[]): Promise<void> {
  // A sweep reaps records and worktrees the caller does not own, which is
  // destructive maintenance: the user's or the pack orch's call, never a
  // slave's. It refuses before reading anything, so nothing is mutated.
  const self = await whoAmI(services);
  if (self.kind === "agent") die("orch clean is operator-only: a spawned agent never reaps records it does not own. Ask the user or your orch to run it.");
  const invocation = parseCommand("clean", args);
  const { flags } = invocation;
  if (invocation.positional.length > 0) throw usageError(invocation);
  const json = flags.has("--json");
  const all = flags.has("--all");
  const swept = await writeRpc(services, "clean", { all, worktreesIn: flags.has("--worktrees") ? process.cwd() : null });
  const malformed = removeMalformedAgentDirs(json, swept.malformed);
  const closed = closeDeadAgentWrites(json, swept.closed);
  const removed = all ? removeDeadAgentDirs(json, swept) : [];
  const worktrees = swept.worktrees === null ? 0 : reportWorktrees(swept.worktrees, json);
  if (json) process.stdout.write(JSON.stringify({ malformed, closed, removed, worktrees }) + "\n");
}

