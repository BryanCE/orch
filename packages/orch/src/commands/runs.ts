import { selectRuns } from "../store/run-rows.ts";
import { loadPresence } from "../presence/store.ts";
import { renderTable } from "../table.ts";
import { resolveTarget } from "../entities/resolve.ts";
import { collapse, truncate } from "../util.ts";
import { formatTimestamp } from "../format.ts";
import { callerKind } from "../policy/caller.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import type { RunRecord } from "../types/store.ts";
import type { Services } from "../types/services.ts";
import type { OrchDir } from "../types/core.ts";

const USAGE = "usage: orch runs [<target>] [-n <count>] [--json]";

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
    formatTimestamp(run.startedAt),
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

/** The `-n` row cap, or undefined when absent. Anything but a safe whole number dies with usage. */
function readLimit(count: string | undefined): number | undefined {
  if (count === undefined) return undefined;
  if (!/^\d+$/.test(count) || !Number.isSafeInteger(Number(count))) die(USAGE);
  return Number(count);
}

/** List durable dispatch history, optionally narrowed to one resolved agent. */
export function cmdRuns(services: Services, args: string[]): void {
  const { flags, positional } = parseCommand("runs", args);
  if (positional.length > 1) die(USAGE);
  const target = positional[0];
  const limit = readLimit(flags.value("-n"));
  const json = flags.has("--json");
  let agentKey: string | undefined;
  if (target !== undefined) {
    // Operators may still query a reaped exact key from durable history. Driving
    // sessions use the normal resolver exclusively, so a foreign key cannot
    // bypass lease scoping; names and handles always use that resolver too.
    const reapedExactKey = callerKind(services.orchDir) === "operator"
      && !loadPresence(services.orchDir).has(target)
      && latestRunForKey(services.orchDir, target) !== undefined;
    agentKey = reapedExactKey ? target : resolveTarget(services.orchDir, services.settings.current(), target).key;
  }
  const runs = selectRuns(services.orchDir, { ...(agentKey === undefined ? {} : { agentKey }), ...(limit === undefined ? {} : { limit }) });
  if (json) {
    process.stdout.write(JSON.stringify(runs, null, 2) + "\n");
    return;
  }
  process.stdout.write(renderRuns(runs) + "\n");
}

/** Find a latest historical row for an exact canonical key when its presence dir was reaped. */
export function latestRunForKey(orchDir: OrchDir, key: string): RunRecord | undefined {
  return selectRuns(orchDir, { agentKey: key, limit: 1 })[0];
}

