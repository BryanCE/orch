import { collapse } from "../entities.ts";
import { loadPresence, spawnedRecords } from "../presence/store.ts";
import type { SpawnedRecord } from "../store/sqlite.ts";
import { renderTable } from "../table.ts";
import { errorMessage } from "../util.ts";
import { writeRpc } from "./daemon.ts";
import { die } from "./target.ts";
import { resultText } from "./target.ts";

import { repositoryBranch, repositoryCommonRoot, worktreeReviewSummary, mergeReviewBranch, removeMergedWorktree } from "../worktree.ts";

interface ReviewItem {
  target: string;
  pane: string;
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


export async function cmdReview(args: string[]): Promise<void> {
  const subcommand = args[0];
  if (!subcommand || !["list", "approve", "reject"].includes(subcommand)) {
    die('usage: orch review list [--json] | approve <target> | reject <target> -m "feedback"');
  }
  if (subcommand === "list") {
    const json = args.slice(1).includes("--json");
    if (args.slice(1).some((arg) => arg !== "--json")) die("usage: orch review list [--json]");
    const items = reviewItems();
    if (json) {
      process.stdout.write(JSON.stringify(items.map(({ repoRoot: _repoRoot, ...item }) => item), null, 2) + "\n");
      return;
    }
    if (!items.length) {
      process.stdout.write("No worktree reviews pending.\n");
      return;
    }
    const rows = items.map((item) => [item.target, item.branch, String(item.commitsAhead), item.task, item.summary]);
    process.stdout.write(renderTable(["TARGET", "BRANCH", "AHEAD", "TASK", "SUMMARY"], rows, [20, 24, 5, 40, 60]) + "\n");
    return;
  }
  const json = args.includes("--json");
  const target = args.find((arg, index) => index > 0 && arg !== "--json");
  if (!target) die(`usage: orch review ${subcommand === "approve" ? "approve <target> [--json]" : 'reject <target> -m "feedback" [--json]'}`);
  const item = findReviewItem(target);
  if (subcommand === "approve") {
    if (args.some((arg) => arg !== "approve" && arg !== target && arg !== "--json")) die("usage: orch review approve <target> [--json]");
    try {
      const strategy = mergeReviewBranch(item.repoRoot, item.branch);
      removeMergedWorktree(item.repoRoot, item.worktree, item.branch);
      if (json) process.stdout.write(JSON.stringify({ target: item.target, approved: true, strategy }) + "\n");
      else process.stdout.write(`Approved ${item.target}: merged (${strategy}) and removed worktree.\n`);
    } catch (error: unknown) {
      die(errorMessage(error));
    }
    return;
  }
  if (subcommand === "reject") {
    const messageIndex = args.indexOf("-m");
    const feedback = messageIndex >= 0 ? args[messageIndex + 1] : undefined;
    const allowedReject = new Set(["reject", target, "-m", feedback, "--json"]);
    if (messageIndex < 0 || !feedback || args.some((arg) => !allowedReject.has(arg))) die('usage: orch review reject <target> -m "feedback" [--json]');
    if (!loadPresence().get(item.pane)) die(`Cannot reject ${item.target}: agent presence is missing.`);
    await writeRpc("steer", { target: item.pane, text: feedback });
    if (json) process.stdout.write(JSON.stringify({ target: item.target, rejected: true }) + "\n");
    else process.stdout.write(`Rejected ${item.target}; feedback re-dispatched in the same worktree.\n`);
    return;
  }
  die('usage: orch review list [--json] | approve <target> | reject <target> -m "feedback"');
}

export async function cmdReviewInteractive(): Promise<void> {
  const items = reviewItems();
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
        await cmdReview(["approve", item.target]);
        continue;
      }

      let feedback = "";
      while (!feedback.trim()) feedback = await rl.question("Feedback: ");
      await cmdReview(["reject", item.target, "-m", feedback]);
    }
  } finally {
    rl.close();
  }
}

function reviewItems(): ReviewItem[] {
  const records = spawnedRecords();
  const presence = loadPresence();
  const items: ReviewItem[] = [];
  for (const record of records.values()) {
    if (!record.worktree || !record.branch) continue;
    if (presence.get(record.pane)?.status?.state !== "done") continue;
    try {
      const baseRoot = repositoryCommonRoot(record.worktree);
      const base = repositoryBranch(baseRoot);
      const details = worktreeReviewSummary(record.worktree, base, record.branch);
      if (details.commitsAhead === 0) continue;
      const entry = presence.get(record.pane);
      const status = entry?.status;
      const adapter = record.adapter ?? status?.agent;
      if (!adapter) continue;
      const resultSummary = resultText(entry?.result) ? collapse(resultText(entry?.result)!) : "";
      items.push({
        target: reviewTarget(record),
        pane: record.pane,
        branch: record.branch,
        worktree: record.worktree,
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

function findReviewItem(target: string): ReviewItem {
  const item = reviewItems().find((candidate) => [candidate.target, candidate.pane, candidate.branch, candidate.worktree].includes(target));
  if (!item) die(`No reviewable worktree matches "${target}". Run 'orch review list'.`);
  return item;
}

export function reviewTarget(record: SpawnedRecord): string {
  const branch = record.branch ?? "";
  return branch.startsWith("orch/") ? branch.slice("orch/".length) : branch || record.pane;
}

