import { execFileSync } from "node:child_process";
import { loadPresence } from "../../presence/store.ts";
import { liveAgentViews } from "../../store/agent-view.ts";
import { selfIdentity } from "../../identity/self.ts";
import { callerAuthority, refuseClose } from "../../policy/close-authority.ts";
import { retryingSync } from "../../retry.ts";
import { errorMessage } from "../../util.ts";
import { getBackend } from "../../backends/registry.ts";
import { isOwnProcess, signalOtherProcess } from "../../backends/process.ts";
import { sleepMs } from "../../backends/shell-ready.ts";
import { lifecycleLogger } from "./index.ts";
import { callDaemon } from "../daemon.ts";
import { die, resolveLifecycleTarget } from "../target.ts";
import { addressOf, indexPresenceById } from "../../entities/lookup.ts";
import { parseCommand } from "../registry.ts";
import type { Backend, BackendHandle, PlacementRole, ProcessRole, RecordedProcess } from "../../types/backend.ts";
import type { Services } from "../../types/services.ts";
import type { OrchDir } from "../../types/core.ts";
import { currentProcess } from "../../store/interval-rows.ts";
import { STREAM_VERBS } from "../events.ts";

/** Read the launch identity from the normalized agent process interval. Presence
 * status carries liveness only and can never authorize a signal. */
function recordedProcess(orchDir: OrchDir, key: string): RecordedProcess | null {
  try {
    const row = currentProcess(orchDir, key);
    return row === undefined ? null : { pid: row.pid, startToken: row.startToken };
  } catch {
    return null;
  }
}

/** Whether the recorded process instance is still present after a close attempt.
 *  The environment that runs the process is the one asked whether it is gone. */
function processRemains(role: ProcessRole, recorded: RecordedProcess): boolean {
  const exited = retryingSync(
    "await closed process",
    () => role.state(recorded) !== "alive",
    { attempts: 40, delayMs: 50, backoff: 1 },
    { sleepSync: sleepMs, retryOnResult: (value) => !value },
  );
  return !exited;
}

/** Close is the SECOND ending verb. The process is gone here; orchd writes the
 *  ending and publishes it. A refused write is this target's failure, not the
 *  sweep's. */
async function endClosedAgent(services: CloseServices, key: string): Promise<string | null> {
  try {
    await callDaemon(services, "agent-closed", { key });
    return null;
  } catch (error: unknown) {
    return errorMessage(error);
  }
}

/** One target's result from a multi-target close, with the reason it failed. */
interface CloseOutcome {
  readonly target: string;
  /** Diagnostic environment coordinate, null when the pane interval is closed. */
  readonly handle: string | null;
  readonly outcome: "done" | "error";
  readonly error: string | null;
}

/** Render a native handle without falling back to Object.prototype.toString. */
export function describeHandle(handle: BackendHandle): string {
  return typeof handle === "string" ? handle : handle.toString();
}

/** Whether the environment still lists this handle (U1). An environment that
 *  cannot answer says nothing either way, so the recorded handle stands. */
function plexerStillHasPane(backend: Backend | null, handle: BackendHandle): boolean | null {
  const inventory = backend?.placementInventory;
  if (!inventory) return null;
  try {
    return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
  } catch {
    return null;
  }
}

/** One agent a close was asked to end, with everything needed to end it. */
interface CloseTarget {
  readonly backend: Backend | null;
  /** The current environment handle, or null when the pane interval is closed. */
  readonly handle: BackendHandle | null;
  readonly key: string;
  readonly recorded: RecordedProcess | null;
  /** Whether a pane operation is meaningful here — false when the plexer no
   *  longer lists the handle (U1), so orch never asks it to close a lost pane. */
  readonly placeKnown: boolean;
}

/**
 * Every orch-managed record on this machine, before cmdClose filters it by close authority.
 *
 * Each row is read DIRECTLY, never resolved through a target string: resolution
 * is what makes a stale row ambiguous, and one unresolvable row must not abort
 * the sweep. A bulk close that closes nothing leaves every name reserved, which
 * is exactly when respawning is the only way out.
 */
function sweepTargets(services: Pick<Services, "orchDir" | "logger">): CloseTarget[] {
  const presence = indexPresenceById(loadPresence(services.orchDir).values());
  const targets: CloseTarget[] = [];
  for (const view of liveAgentViews(services.orchDir)) {
    const address = addressOf(view, presence);
    const backend = getBackend(view.environment.plexer ?? "") ?? null;
    if (!backend) {
      lifecycleLogger(services.logger, address).warn("close.unknown-backend", { backend: view.environment.plexer, handle: address });
      process.stdout.write(`skipping ${address}: unknown backend ${JSON.stringify(view.environment.plexer)} (reaping the record)\n`);
    }
    const handle = view.environment.handle;
    const paneState = handle === null ? false : plexerStillHasPane(backend, handle);
    targets.push({
      backend, handle, key: address, recorded: recordedProcess(services.orchDir, address),
      // Unknown inventory still permits a real recorded handle to be handed to
      // the plexer; a null handle is never replaced with the agent id.
      placeKnown: handle !== null && paneState !== false,
    });
  }
  return targets;
}

/** Resolve the targets named on the command line. */
function namedTargets(services: Services, positional: readonly string[]): CloseTarget[] {
  const settings = services.settings.current();
  return positional.map((target) => {
    const resolved = resolveLifecycleTarget(services.orchDir, settings, target);
    // Driving sessions must resolve through their open lease; the operator remains
    // unscoped. Close authority is the additional provenance check in cmdClose.
    // `resolveLifecycleTarget` also supplies process-oriented fallbacks (pid/key).
    // Close may hand only the environment's actual pane handle to placer.
    const handle = resolved.view !== null ? resolved.view.environment.handle : resolved.entity.paneId;
    return {
      backend: resolved.backend,
      handle,
      key: resolved.key,
      recorded: recordedProcess(services.orchDir, resolved.key),
      // A pane-capable backend's stale registry row may outlive its pane. Do
      // not invoke a provider with an opaque identity handle in that case.
      placeKnown: handle !== null && (resolved.backend.placementInventory === null || resolved.entity.paneId !== null),
    };
  });
}

/** How one target was ended, or why it could not be. `failure` is the REAL
 *  reason at each point it can go wrong, never one sentence covering all four. */
interface CloseAttempt {
  readonly failure: string | null;
  readonly signalled: boolean;
  readonly closedByBackend: boolean;
  /** True when the backend explicitly said the pane was already absent. */
  readonly alreadyAbsent: boolean;
}

/** Signal the recorded process INSTANCE, never merely the pid: reaping waits
 *  until that same (pid, start_token) is gone, not until kill(2) is accepted.
 *  The signal goes through the environment's own process role — the same port
 *  that started the process — never a raw kill at this call site. */
function closeByProcess(role: ProcessRole, recorded: RecordedProcess): CloseAttempt {
  try {
    role.kill(recorded, "SIGTERM");
  } catch (error: unknown) {
    return { failure: errorMessage(error), signalled: false, closedByBackend: false, alreadyAbsent: false };
  }
  const failure = processRemains(role, recorded) ? `process ${recorded.pid} is still running after SIGTERM` : null;
  return { failure, signalled: true, closedByBackend: false, alreadyAbsent: false };
}

/** A pane host owns closure when process identity is unavailable. */
function closeByPane(placer: PlacementRole, handle: BackendHandle): CloseAttempt {
  try {
    placer.close(handle);
    return { failure: null, signalled: false, closedByBackend: true, alreadyAbsent: false };
  } catch (error: unknown) {
    // A pane that is already gone is the desired end state, not a close error.
    const message = errorMessage(error);
    if (message.includes("pane_not_found")) {
      return { failure: null, signalled: false, closedByBackend: true, alreadyAbsent: true };
    }
    return { failure: message, signalled: false, closedByBackend: false, alreadyAbsent: false };
  }
}

/** A reported close is not proof: ask the environment whether the handle is gone.
 *  An environment that cannot answer proves nothing, so it reports no failure. */
function stillListed(target: CloseTarget): string | null {
  const handle = target.handle;
  if (handle === null || !target.backend?.placementInventory) return null;
  try {
    const listed = target.backend.placementInventory.list()
      .some((entry) => describeHandle(entry.handle) === describeHandle(handle));
    return listed ? `${describeHandle(handle)} is still listed by ${target.backend.id} after the close` : null;
  } catch {
    return null;
  }
}

/** The one mechanism that can end this target, decided from the environment's
 *  roles and the recorded process BEFORE anything is attempted. A variant
 *  carries what its own close needs, so the attempt re-derives nothing. */
type CloseRoute =
  | { readonly kind: "pane"; readonly placer: PlacementRole; readonly handle: BackendHandle }
  | { readonly kind: "process"; readonly role: ProcessRole; readonly recorded: RecordedProcess }
  | { readonly kind: "none" };

/** Whoever HOLDS the agent ends it: a placed agent's recorded process is the
 *  place's own shell, which ignores SIGTERM, so its place host is asked first. */
function closeRoute(target: CloseTarget, placer: PlacementRole | null): CloseRoute {
  if (placer !== null && target.placeKnown && target.handle !== null) {
    return { kind: "pane", placer, handle: target.handle };
  }
  const role = target.backend?.process ?? null;
  const recorded = target.recorded;
  if (recorded === null || role === null) return { kind: "none" };
  // A dead or recycled pid is the same answer as no record at all.
  return role.state(recorded) === "alive" ? { kind: "process", role, recorded } : { kind: "none" };
}

function takeRoute(route: CloseRoute): CloseAttempt {
  switch (route.kind) {
    case "pane": return closeByPane(route.placer, route.handle);
    case "process": return closeByProcess(route.role, route.recorded);
    case "none": return { failure: null, signalled: false, closedByBackend: false, alreadyAbsent: false };
  }
}

/** End one agent by the strongest means available, and say what happened. */
function attemptClose(target: CloseTarget): CloseAttempt {
  const route = closeRoute(target, target.backend?.placement ?? null);
  const attempt = takeRoute(route);
  // Only a close the pane host was actually asked for is verified against it.
  if (attempt.failure !== null || route.kind !== "pane" || attempt.alreadyAbsent) return attempt;
  const lingering = stillListed(target);
  return lingering === null ? attempt : { ...attempt, failure: lingering };
}

/** SIGTERM this session's `orch events` and `orch monitor` streams, never orch itself. */
function killEventStreams(): number {
  let pids: number[] = [];
  try {
    pids = execFileSync("pgrep", ["-f", `orch (${STREAM_VERBS.join("|")})`]).toString().trim().split("\n").filter(Boolean).map(Number);
  } catch { /* no stream running */ }
  const kill = pids.filter((pid) => !isOwnProcess(pid));
  for (const pid of kill) { try { signalOtherProcess(pid, "SIGTERM"); } catch { /* already gone */ } }
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
    const { failure: processFailure, signalled, closedByBackend } = attemptClose(target);
    const failure = processFailure ?? await endClosedAgent(services, target.key);
    if (failure !== null) {
      lifecycleLogger(logger, target.key).error("close.failed", { handle, error: failure });
      results.push({ target: target.key, handle, outcome: "error", error: failure });
      process.stdout.write(`Could not close ${target.key}: ${failure}\n`);
      continue;
    }
    closed.push(target.key);
    results.push({ target: target.key, handle, outcome: "done", error: null });
    if (!json) process.stdout.write(`Closed ${target.key}${closedByBackend || signalled ? "." : " (already stopped)."}\n`);
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

export async function cmdClose(services: Services, args: string[]): Promise<void> {
  const { flags, positional } = parseCommand("close", args);
  const all = flags.has("--all");
  const stream = flags.has("--stream");
  const json = flags.has("--json");
  if (!all && !positional.length) die("usage: orch close <target>... | --all [--stream] [--json]");

  const authority = callerAuthority(selfIdentity(services.orchDir));
  const named = namedTargets(services, positional);
  const refusal = named.map((target) => refuseClose(services.orchDir, authority, target.key)).find((reason) => reason !== null);
  if (refusal !== undefined && refusal !== null) die(refusal);
  // A sweep skips what is not the caller's; a named target is refused.
  const swept = all ? sweepTargets(services).filter((target) => refuseClose(services.orchDir, authority, target.key) === null) : [];

  reportClose(await closeEachTarget(services, [...swept, ...named], json), { all, stream, json });
}

export function cmdAbort(services: Services, args: string[]) {
  const { flags, positional } = parseCommand("abort", args);
  const json = flags.has("--json");
  const target = positional[0];
  if (!target) die("usage: orch abort <target> [--force] [--json]");
  // Abort itself has no close-authority gate. Lifecycle resolution still scopes a
  // driving session by its open lease; the operator remains unscoped.
  const { backend, handle, entity } = resolveLifecycleTarget(services.orchDir, services.settings.current(), target);
  const input = backend.agentInput;
  if (!entity.paneId || !input) {
    const reason = !entity.paneId ? "no-pane" : "no-environment-role";
    const text = !entity.paneId ? `${target} has no pane; abort does not apply.` : "this pane environment does not provide abort";
    if (json) process.stdout.write(JSON.stringify({ outcome: "answer", reason, text }) + "\n");
    else process.stdout.write(text + "\n");
    return;
  }
  input.sendKeys(handle, ["Escape"]);
  sleepMs(500);
  input.sendKeys(handle, ["Escape"]);
  if (json) process.stdout.write(JSON.stringify({ target: handle, aborted: true }) + "\n");
  else process.stdout.write(`Aborted ${describeHandle(handle)}.\n`);
}

