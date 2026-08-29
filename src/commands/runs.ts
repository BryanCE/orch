import { selectRuns, type RunRecord } from "../store/run-rows.ts";
import { loadPresence, orchDir } from "../presence/store.ts";
import { renderTable } from "../table.ts";
import { collapse, resolveTarget } from "../entities.ts";
import { truncate } from "../util.ts";
import { die } from "./target.ts";

const USAGE = "usage: orch runs [<target>] [-n <count>] [--json]";

/** Format an epoch-millisecond timestamp for a compact, deterministic human-readable table cell. */
function formatRunStarted(timestamp: number): string {
  const when = new Date(timestamp);
  if (!Number.isFinite(when.getTime())) return "?";
  return when.toISOString().replace("T", " ").slice(0, 19);
}

/** A running row has no duration yet; never turn that into a misleading zero. */
function formatRunDuration(run: Pick<RunRecord, "startedAt" | "finishedAt">): string {
  if (run.finishedAt === undefined) return "running";
  const started = run.startedAt;
  const finished = run.finishedAt;
  if (!Number.isFinite(started) || !Number.isFinite(finished)) return "?";
  const seconds = Math.max(0, (finished - started) / 1000);
  if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function formatCost(cost: number | undefined): string {
  return cost === undefined ? "-" : `$${cost.toFixed(2)}`;
}

function formatTokens(run: RunRecord): string {
  if (run.tokensIn === undefined && run.tokensOut === undefined) return "-";
  return `${run.tokensIn ?? 0}/${run.tokensOut ?? 0}`;
}

/** Convert stored rows into the glanceable table used by `orch runs`. */
export function renderRuns(runs: readonly RunRecord[]): string {
  if (!runs.length) return "No runs.";
  const rows = runs.map((run) => [
    formatRunStarted(run.startedAt),
    formatRunDuration(run),
    run.agentKey,
    run.model ?? "-",
    run.state,
    formatCost(run.cost),
    formatTokens(run),
    truncate(collapse(run.task ?? ""), 60),
  ]);
  return renderTable(["STARTED", "DURATION", "AGENT", "MODEL", "STATE", "COST", "TOKENS", "TASK"], rows, [19, 10, 30, 28, 12, 10, 14, 60]);
}

function readArgs(args: string[]): { target?: string; limit?: number; json: boolean } {
  let target: string | undefined;
  let limit: number | undefined;
  const positional: string[] = [];
  let json = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "-n") {
      const value = args[++index];
      if (value === undefined || !/^\d+$/.test(value)) die(USAGE);
      limit = Number(value);
      if (!Number.isSafeInteger(limit)) die(USAGE);
      continue;
    }
    if (arg.startsWith("-")) die(USAGE);
    positional.push(arg);
  }
  if (positional.length > 1) die(USAGE);
  target = positional[0];
  return { target, limit, json };
}

/** List durable dispatch history, optionally narrowed to one resolved agent. */
export function cmdRuns(args: string[]): void {
  const { target, limit, json } = readArgs(args);
  let agentKey: string | undefined;
  if (target !== undefined) {
    // Historical rows use canonical agent keys. A reaped exact key has no entity
    // left for resolveTarget, so retain that canonical read path; other spellings
    // (names, handles, suffixes) use the normal resolver.
    const reapedExactKey = !loadPresence().has(target) && latestRunForKey(target) !== undefined;
    agentKey = reapedExactKey ? target : resolveTarget(target).key;
  }
  const runs = selectRuns(orchDir(), { ...(agentKey === undefined ? {} : { agentKey }), ...(limit === undefined ? {} : { limit }) });
  if (json) {
    process.stdout.write(JSON.stringify(runs, null, 2) + "\n");
    return;
  }
  process.stdout.write(renderRuns(runs) + "\n");
}

/** Find a latest historical row for an exact canonical key when its presence dir was reaped. */
export function latestRunForKey(key: string): RunRecord | undefined {
  return selectRuns(orchDir(), { agentKey: key, limit: 1 })[0];
}

