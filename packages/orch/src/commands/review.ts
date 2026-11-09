import { renderTable } from "../table.ts";
import { readRpc, writeRpc } from "./daemon.ts";
import { readFleet } from "./fleet.ts";
import { indexPresenceById } from "../shared/lookup.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import { usageError } from "../cli/usage.ts";
import type { Invocation } from "../cli/spec.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { Services } from "../types/services.ts";
import { closeAgentQuietly } from "./lifecycle/close.ts";

/** One finished agent's branch waiting for review, read by the orchd of the host its worktree is on. */
type ReviewItem = ResultOf<"reviews">["reviews"][number];

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
  const items = await reviewItems(services);
  if (flags.has("--json")) {
    process.stdout.write(JSON.stringify(items, null, 2) + "\n");
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
async function reviewedItem(services: Services, invocation: Invocation): Promise<ReviewItem> {
  const { positional } = invocation;
  const target = positional[0];
  if (!target || positional.length !== 1) throw usageError(invocation);
  return findReviewItem(await reviewItems(services), target);
}

async function reviewApprove(services: Services, invocation: Invocation): Promise<void> {
  const { flags } = invocation;
  const item = await reviewedItem(services, invocation);
  const { base } = item;
  const landed = await writeRpc(services, "agent-worktree", { key: item.key, action: "land" });
  if (landed.action !== "land") die(`orchd answered ${landed.action} to land`);
  // The agent's directory is about to go: nothing it does after this lands anywhere.
  if (!item.ended) await closeAgentQuietly(services, item.key);
  await writeRpc(services, "agent-worktree", { key: item.key, action: "remove" });
  const strategy = landed.strategy;
  if (flags.has("--json")) process.stdout.write(JSON.stringify({ target: item.target, approved: true, strategy }) + "\n");
  else process.stdout.write(`Approved ${item.target}: landed on ${base} (${strategy}), closed the agent and removed the worktree.\n`);
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
  const items = await reviewItems(services);
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

function reviewItems(services: Services): Promise<ReviewItem[]> {
  return readRpc(services, "reviews", undefined).then((answer) => answer.reviews);
}

function findReviewItem(items: readonly ReviewItem[], target: string): ReviewItem {
  const item = items.find((candidate) => [candidate.target, candidate.key, candidate.branch, candidate.worktree].includes(target));
  if (!item) die(`No reviewable worktree matches "${target}". Run 'orch review list'.`);
  return item;
}
