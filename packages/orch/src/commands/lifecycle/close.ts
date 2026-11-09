import { execFileSync } from "node:child_process";
import { errorMessage } from "../../util.ts";
import { describeHandle } from "../../backends/backend.ts";
import { attemptClose, closeTargetOf, type CloseTarget } from "../../control/close-attempt.ts";
import { isOwnProcess, signalOtherProcess } from "../../backends/process.ts";
import { lifecycleLogger } from "./index.ts";
import { callDaemon, readRpc } from "../daemon.ts";
import { hostCallTimeoutMs } from "../host.ts";
import { cmdSteer } from "../control.ts";
import { die } from "../target.ts";
import { resolveLifecycle, targetName } from "../resolve.ts";
import { callerCredential } from "../../identity/credential.ts";
import { parseCommand } from "../registry.ts";
import { usageError } from "../../cli/usage.ts";
import type { Services } from "../../types/services.ts";
import { STREAM_VERBS } from "../events.ts";
import { observedHere } from "../../local-process.ts";

/** Close is the SECOND ending verb. The process is gone here; orchd writes the
 *  ending and publishes it. For an agent on a linked host orchd first asks that host's
 *  orchd to close its own agent, over the link. A refused write is this target's
 *  failure, not the sweep's. */
async function endClosedAgent(services: CloseServices, key: string, timeoutMs?: number): Promise<string | null> {
  try {
    await callDaemon(services, "agent-closed", { key }, {}, timeoutMs);
    return null;
  } catch (error: unknown) {
    return errorMessage(error);
  }
}

/** One target's close: whether it failed and why, and whether this close stopped it. */
interface TargetClosed {
  readonly failure: string | null;
  readonly stopped: boolean;
}

/** End one target where it runs, and record the ending. One on a linked host is that host's
 *  orchd's to end; a pid here names nothing. */
async function closeOne(services: CloseServices, target: CloseTarget): Promise<TargetClosed> {
  if (target.recorded.kind === "elsewhere") {
    const failure = await endClosedAgent(services, target.key, hostCallTimeoutMs(services));
    return failure === null ? { failure, stopped: true } : { failure: `could not end ${target.name} on ${target.recorded.hostName}: ${failure}`, stopped: false };
  }
  const attempt = attemptClose(target);
  const failure = attempt.failure ?? await endClosedAgent(services, target.key);
  return { failure, stopped: attempt.signalled || attempt.closedByBackend };
}

/** One target's result from a multi-target close, with the reason it failed. */
interface CloseOutcome {
  readonly target: string;
  /** Diagnostic environment coordinate, null when the pane interval is closed. */
  readonly handle: string | null;
  readonly outcome: "done" | "error";
  readonly error: string | null;
}


/** SIGTERM this session's `orch events` and `orch monitor` streams, never orch itself. */
function killEventStreams(): number {
  let pids: number[] = [];
  try {
    pids = execFileSync("pgrep", ["-f", `orch (${STREAM_VERBS.join("|")})`]).toString().trim().split("\n").filter(Boolean).map(Number);
  } catch { /* no stream running */ }
  const kill = pids.filter((pid) => !isOwnProcess(pid));
  for (const pid of kill) { try { signalOtherProcess(observedHere(pid, null), "SIGTERM"); } catch { /* already gone */ } }
  return kill.length;
}

/** Close every target once, in order, recording an outcome for each.
 *
 *  Multi-target commands record one outcome per target with the real error text.
 *  Prose on stderr is not something a caller
 *  can act on, and a payload carrying only the successes cannot tell a full
 *  sweep from a half one. A target named twice is closed once. */
type CloseServices = Pick<Services, "orchDir" | "settings" | "logger">;

async function closeEachTarget(services: CloseServices, targets: readonly CloseTarget[], json: boolean): Promise<{ results: CloseOutcome[]; closed: string[]; ok: number }> {
  const logger = services.logger;
  const results: CloseOutcome[] = [];
  const closed: string[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.key)) continue;
    seen.add(target.key);
    const handle = target.handle === null ? null : describeHandle(target.handle);
    const name = target.name;
    const { failure, stopped } = await closeOne(services, target);
    if (failure !== null) {
      lifecycleLogger(logger, target.key).error("close.failed", { handle, error: failure });
      results.push({ target: target.key, handle, outcome: "error", error: failure });
      if (!json) process.stdout.write(`Could not close ${name}: ${failure}\n`);
      continue;
    }
    closed.push(target.key);
    results.push({ target: target.key, handle, outcome: "done", error: null });
    if (!json) process.stdout.write(`Closed ${name}${stopped ? "." : " (already stopped)."}\n`);
  }
  return { results, closed, ok: closed.length };
}

/** Say what the whole close did, and set the exit code from it. */
function reportClose(
  outcome: { results: CloseOutcome[]; closed: string[]; ok: number },
  flags: { all: boolean; stream: boolean; json: boolean },
): void {
  const { results, closed, ok } = outcome;
  const { all, stream, json } = flags;
  const requested = results.length;
  if (all && !requested && !json) process.stdout.write("No fleet agents to close.\n");
  if (stream) {
    const killed = killEventStreams();
    if (!json) process.stdout.write(killed ? `Killed ${killed} orch stream process(es).\n` : "No orch monitor or events stream running.\n");
  }
  if (json) process.stdout.write(JSON.stringify({ closed, results, requested, ok, stream }) + "\n");
  // `process.exitCode`, never `process.exit()`: the JSON above is buffered, and
  // exiting here truncates the very payload a caller reads to find out WHICH
  // target failed (src/commands/index.ts:272 states the same rule).
  if (requested && ok !== requested) process.exitCode = 1;
}

/** Close one agent as another command's step: refused or failed ends that command. */
export async function closeAgentQuietly(services: Services, target: string): Promise<void> {
  const answer = await readRpc(services, "close-targets", { caller: callerCredential(), targets: [target], all: false });
  if (answer.refusal !== null) die(answer.refusal);
  const { results, ok } = await closeEachTarget(services, answer.targets.map(closeTargetOf), true);
  if (ok !== results.length) die(`could not close ${target}: ${results.map((result) => result.error).join("; ")}`);
}

export async function cmdClose(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("close", args);
  const { flags, positional } = invocation;
  const all = flags.has("--all");
  const stream = flags.has("--stream");
  const json = flags.has("--json");
  if (!all && !positional.length) throw usageError(invocation);

  const answer = await readRpc(services, "close-targets", { caller: callerCredential(), targets: [...positional], all });
  if (answer.refusal !== null) die(answer.refusal);
  reportClose(await closeEachTarget(services, answer.targets.map(closeTargetOf), json), { all, stream, json });
}

export async function cmdAbort(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("abort", args);
  const { flags, positional } = invocation;
  const json = flags.has("--json");
  const target = positional[0];
  const text = positional.slice(1).join(" ");
  if (!target) throw usageError(invocation);
  // Abort itself has no close-authority gate. Lifecycle resolution still scopes a
  // driving session by its open lease; the operator remains unscoped.
  // orchd aborts it where it runs: here, or on its linked host over the link.
  const resolved = await resolveLifecycle(services, target);
  const aborted = await callDaemon(services, "abort", { target: resolved.key }, {}, hostCallTimeoutMs(services));
  if (aborted.outcome === "answer") {
    process.stdout.write((json ? JSON.stringify(aborted) : aborted.text) + "\n");
    return;
  }
  if (json) process.stdout.write(JSON.stringify({ target: resolved.key, aborted: true }) + "\n");
  else process.stdout.write(`Aborted ${targetName(resolved)}.\n`);
  // The text is a steer: the cancelled turn is gone, and this is what runs instead.
  if (text) await cmdSteer(services, [target, text, ...(json ? ["--json"] : [])]);
}

