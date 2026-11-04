import { renderTable } from "../table.ts";
import { collapse, errorMessage } from "../util.ts";
import { writeRpc } from "./daemon.ts";
import { readFleet } from "./fleet.ts";
import { addressOf, indexPresenceById } from "../entities/lookup.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import { usageError } from "../cli/usage.ts";
import type { Invocation } from "../cli/spec.ts";
import type { FleetSnapshot } from "./fleet.ts";
import type { Services } from "../types/services.ts";
import { repositoryCommonRoot, worktreeHasChanges, worktreeReviewSummary } from "../worktrees/repository.ts";
import { worktreeProvider } from "../worktrees/registry.ts";
import { isWorktreeProviderId, type WorktreeProviderId } from "../types/worktree.ts";
import { closeAgentQuietly } from "./lifecycle/close.ts";

interface ReviewItem {
  target: string;
  /** The address the agent answers to; identity, never a pane. */
  key: string;
  branch: string;
  worktree: string;
  base: string;
  state: string;
  task: string;
  summary: string;
  diff: string;
  commitsAhead: number;
  adapter: string;
  repoRoot: string;
  provider: WorktreeProviderId;
  /** The agent has ended: its work stands, and there is nobody left to send feedback to. */
  ended: boolean;
}


export async function cmdReview(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("review", args);
  switch (invocation.command.name) {
    case "list": return await reviewList(services, invocation);
    case "approve": return await reviewApprove(services, invocation);
    case "reject": return await reviewReject(services, invocation);
    default:
      if (invocation.positional.length) throw usageError(invocation);
      return await reviewInteractive(services);
  }
}

async function reviewList(services: Services, invocation: Invocation): Promise<void> {
  const { flags, positional } = invocation;
  if (positional.length) throw usageError(invocation);
  const fleet = await readFleet(services);
  const items = reviewItems(fleet, branchPrefix(services));
  if (flags.has("--json")) {
    process.stdout.write(JSON.stringify(items.map(({ repoRoot: _repoRoot, ...item }) => item), null, 2) + "\n");
    return;
  }
  if (!items.length) {
    process.stdout.write("No worktree reviews pending.\n");
    return;
  }
  const rows = items.map((item) => [item.target, item.branch, String(item.commitsAhead), item.task, item.summary]);
  process.stdout.write(renderTable(["TARGET", "BRANCH", "AHEAD", "TASK", "SUMMARY"], rows, [20, 24, 5, 40, 60]) + "\n");
}

function branchPrefix(services: Services): string {
  return services.settings.current().worktrees.branch_prefix;
}

/** The one review target a subcommand names, or its usage line. */
async function reviewedItem(services: Services, invocation: Invocation): Promise<ReviewItem> {
  const { positional } = invocation;
  const target = positional[0];
  if (!target || positional.length !== 1) throw usageError(invocation);
  return findReviewItem(await readFleet(services), target, branchPrefix(services));
}

async function reviewApprove(services: Services, invocation: Invocation): Promise<void> {
  const { flags } = invocation;
  const item = await reviewedItem(services, invocation);
  if (worktreeHasChanges(item.worktree)) {
    die(`${item.target} has uncommitted changes in ${item.worktree}. Reject it with feedback so the agent commits them, or commit them there yourself.`);
  }
  const provider = worktreeProvider(item.provider, services.settings.current().worktrees);
  const { repoRoot: root, worktree, branch, base } = item;
  try {
    const strategy = provider.land({ root, worktree, branch, base });
    // The agent's directory is about to go: nothing it does after this lands anywhere.
    if (!item.ended) await closeAgentQuietly(services, item.key);
    // Clean and landed, so there is nothing to lose. `discard` because `git branch -d`
    // judges a branch against the root's HEAD, and the base may be checked out elsewhere.
    provider.remove({ root, worktree, branch, discard: true });
    if (flags.has("--json")) process.stdout.write(JSON.stringify({ target: item.target, approved: true, strategy }) + "\n");
    else process.stdout.write(`Approved ${item.target}: landed on ${base} (${strategy}), closed the agent and removed the worktree.\n`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function reviewReject(services: Services, invocation: Invocation): Promise<void> {
  const { flags } = invocation;
  const feedback = flags.value("-m");
  if (!feedback) throw usageError(invocation, "-m needs the feedback to send");
  const fleet = await readFleet(services);
  const item = await reviewedItem(services, invocation);
  if (item.ended) die(`Cannot reject ${item.target}: the agent has ended. Its branch ${item.branch} is still there to land or clear.`);
  if (!indexPresenceById(fleet.presence).get(item.key)) die(`Cannot reject ${item.target}: agent presence is missing.`);
  await writeRpc(services, "steer", { target: item.key, text: feedback });
  if (flags.has("--json")) process.stdout.write(JSON.stringify({ target: item.target, rejected: true }) + "\n");
  else process.stdout.write(`Rejected ${item.target}; feedback re-dispatched in the same worktree.\n`);
}

async function reviewInteractive(services: Services): Promise<void> {
  const fleet = await readFleet(services);
  const items = reviewItems(fleet, branchPrefix(services));
  if (!items.length) {
    process.stdout.write("No worktree reviews pending.\n");
    return;
  }

  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (const item of items) {
      process.stdout.write(`\n=== ${item.target}: ${item.branch} vs ${item.base} ===\n`);
      if (item.task) process.stdout.write(`Task: ${item.task}\n`);
      if (item.summary) process.stdout.write(`Summary: ${item.summary}\n`);
      process.stdout.write("\n" + (item.diff || "(no diff)\n") + (item.diff?.endsWith("\n") ? "" : "\n"));

      let action = "";
      while (action !== "a" && action !== "r" && action !== "s") {
        action = (await rl.question("Action [a]pprove/[r]eject/[s]kip: ")).trim().toLowerCase();
      }
      if (action === "s") continue;
      if (action === "a") {
        await cmdReview(services, ["approve", item.target]);
        continue;
      }

      let feedback = "";
      while (!feedback.trim()) feedback = await rl.question("Feedback: ");
      await cmdReview(services, ["reject", item.target, "-m", feedback]);
    }
  } finally {
    rl.close();
  }
}

function reviewItems(fleet: FleetSnapshot, prefix: string): ReviewItem[] {
  // A1: worktree and branch are ENVIRONMENT axes composed onto an agent, and
  // presence joins to that agent by its minted id — not by a pane key.
  const presence = indexPresenceById(fleet.presence);
  const items: ReviewItem[] = [];
  for (const view of fleet.views) {
    const { worktree, branch, worktreeBase: base, worktreeProvider: provider } = view.environment;
    if (worktree === null || branch === null || base === null || provider === null || !isWorktreeProviderId(provider)) continue;
    const entry = presence.get(view.id);
    // Closing a finished agent is the normal end of its turn; its branch still waits for review.
    const ended = view.endedAt !== null;
    if (!ended && entry?.status?.state !== "done") continue;
    try {
      const baseRoot = repositoryCommonRoot(worktree);
      const details = worktreeReviewSummary(worktree, base, branch);
      if (details.commitsAhead === 0) continue;
      const status = entry?.status;
      const adapter = view.harnessId;
      if (!adapter) continue;
      const key = addressOf(view, presence);
      const resultSummary = entry?.result ? collapse(entry.result) : "";
      items.push({
        target: reviewTarget(key, branch, prefix),
        key,
        branch,
        worktree,
        base,
        state: "done",
        task: status?.task ?? "",
        summary: resultSummary || details.summary,
        diff: details.diff,
        commitsAhead: details.commitsAhead,
        adapter,
        repoRoot: baseRoot,
        provider,
        ended,
      });
    } catch {
      // Stale or removed worktrees are not reviewable.
    }
  }
  return items;
}

function findReviewItem(fleet: FleetSnapshot, target: string, prefix: string): ReviewItem {
  const item = reviewItems(fleet, prefix).find((candidate) => [candidate.target, candidate.key, candidate.branch, candidate.worktree].includes(target));
  if (!item) die(`No reviewable worktree matches "${target}". Run 'orch review list'.`);
  return item;
}

function reviewTarget(key: string, branch: string, prefix: string): string {
  return branch.startsWith(prefix) ? branch.slice(prefix.length) : branch || key;
}

