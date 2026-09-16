import { renderTable } from "../table.ts";
import { collapse, errorMessage } from "../util.ts";
import { writeRpc } from "./daemon.ts";
import { readFleet } from "./fleet.ts";
import { addressOf, indexPresenceById } from "../entities/lookup.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import type { Invocation } from "../cli/spec.ts";
import type { FleetSnapshot } from "./fleet.ts";
import type { Services } from "../types/services.ts";
import { repositoryBranch, repositoryCommonRoot, worktreeReviewSummary, mergeReviewBranch, removeMergedWorktree } from "../worktree.ts";

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
}


export async function cmdReview(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("review", args);
  switch (invocation.command.name) {
    case "list": return await reviewList(services, invocation);
    case "approve": return await reviewApprove(services, invocation);
    case "reject": return await reviewReject(services, invocation);
    default:
      if (invocation.positional.length) die('usage: orch review list [--json] | approve <target> | reject <target> -m "feedback"');
      return await reviewInteractive(services);
  }
}

async function reviewList(services: Services, { flags, positional }: Invocation): Promise<void> {
  const fleet = await readFleet(services);
  if (positional.length) die("usage: orch review list [--json]");
  const items = reviewItems(fleet);
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

/** The one review target a subcommand names, or its usage line. */
async function reviewedItem(services: Services, positional: readonly string[], usage: string): Promise<ReviewItem> {
  const fleet = await readFleet(services);
  const target = positional[0];
  if (!target || positional.length !== 1) die(usage);
  return findReviewItem(fleet, target);
}

async function reviewApprove(services: Services, { flags, positional }: Invocation): Promise<void> {
  const item = await reviewedItem(services, positional, "usage: orch review approve <target> [--json]");
  try {
    const strategy = mergeReviewBranch(item.repoRoot, item.branch);
    removeMergedWorktree(item.repoRoot, item.worktree, item.branch);
    if (flags.has("--json")) process.stdout.write(JSON.stringify({ target: item.target, approved: true, strategy }) + "\n");
    else process.stdout.write(`Approved ${item.target}: merged (${strategy}) and removed worktree.\n`);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function reviewReject(services: Services, { flags, positional }: Invocation): Promise<void> {
  const fleet = await readFleet(services);
  const usage = 'usage: orch review reject <target> -m "feedback" [--json]';
  const item = await reviewedItem(services, positional, usage);
  const feedback = flags.value("-m");
  if (!feedback) die(usage);
  if (!indexPresenceById(fleet.presence).get(item.key)) die(`Cannot reject ${item.target}: agent presence is missing.`);
  await writeRpc(services, "steer", { target: item.key, text: feedback });
  if (flags.has("--json")) process.stdout.write(JSON.stringify({ target: item.target, rejected: true }) + "\n");
  else process.stdout.write(`Rejected ${item.target}; feedback re-dispatched in the same worktree.\n`);
}

async function reviewInteractive(services: Services): Promise<void> {
  const fleet = await readFleet(services);
  const items = reviewItems(fleet);
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

function reviewItems(fleet: FleetSnapshot): ReviewItem[] {
  // A1: worktree and branch are ENVIRONMENT axes composed onto an agent, and
  // presence joins to that agent by its minted id — not by a pane key.
  const presence = indexPresenceById(fleet.presence);
  const items: ReviewItem[] = [];
  for (const view of fleet.views.filter((view) => view.endedAt === null)) {
    const { worktree, branch } = view.environment;
    if (worktree === null || branch === null) continue;
    const entry = presence.get(view.id);
    if (entry?.status?.state !== "done") continue;
    try {
      const baseRoot = repositoryCommonRoot(worktree);
      const base = repositoryBranch(baseRoot);
      const details = worktreeReviewSummary(worktree, base, branch);
      if (details.commitsAhead === 0) continue;
      const status = entry.status;
      const adapter = view.harnessId;
      if (!adapter) continue;
      const key = addressOf(view, presence);
      const resultSummary = entry.result ? collapse(entry.result) : "";
      items.push({
        target: reviewTarget({ key, branch }),
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
      });
    } catch {
      // Stale or removed worktrees are not reviewable.
    }
  }
  return items;
}

function findReviewItem(fleet: FleetSnapshot, target: string): ReviewItem {
  const item = reviewItems(fleet).find((candidate) => [candidate.target, candidate.key, candidate.branch, candidate.worktree].includes(target));
  if (!item) die(`No reviewable worktree matches "${target}". Run 'orch review list'.`);
  return item;
}

function reviewTarget(agent: { key: string; branch: string | null }): string {
  const branch = agent.branch ?? "";
  return branch.startsWith("orch/") ? branch.slice("orch/".length) : branch || agent.key;
}

