import { renderTable } from "../table.ts";
import { collapse, truncate } from "../util.ts";
import { formatTimestamp } from "../format.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import { readRpc } from "./daemon.ts";
import { callerCredential } from "../identity/credential.ts";
import type { RunRecord } from "../types/store.ts";
import type { Services } from "../types/services.ts";

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
export async function cmdRuns(services: Services, args: string[]): Promise<void> {
  const { flags, positional } = parseCommand("runs", args);
  if (positional.length > 1) die(USAGE);
  const target = positional[0];
  const limit = readLimit(flags.value("-n"));
  const json = flags.has("--json");
  const { runs } = await readRpc(services, "runs", { caller: callerCredential(), ...(target === undefined ? {} : { target }), ...(limit === undefined ? {} : { limit }) });
  if (json) {
    process.stdout.write(JSON.stringify(runs, null, 2) + "\n");
    return;
  }
  process.stdout.write(renderRuns(runs) + "\n");
}

