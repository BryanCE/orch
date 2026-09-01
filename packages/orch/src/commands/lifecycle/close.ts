import { execFileSync } from "node:child_process";
import { tryParseIdentity } from "../../backends/identity.ts";
import { loadPresence, orchDir } from "../../presence/store.ts";
import { liveAgentViews } from "../../store/agent-view.ts";
import { agentById, endAgent } from "../../store/agent-rows.ts";
import { selfId, selfIdentity } from "../../identity/self.ts";
import { callerAuthority, refuseClose } from "../../policy/close-authority.ts";
import { retryingSync } from "../../retry.ts";
import { errorMessage } from "../../util.ts";
import { processInstanceMatches, processIsAlive } from "../../process-identity.ts";
import { getBackend } from "../../backends/registry.ts";
import { sleepMs } from "../../backends/pane-ready.ts";
import { lifecycleLogger } from "./index.ts";
import { rpcCall } from "../../daemon/rpc/client.ts";
import { agentAddress, die, presenceById, resolveLifecycleTarget, splitOptionFlags } from "../target.ts";
import type { Backend, BackendHandle, PaneHostRole } from "../../types/backend.ts";
import { currentProcess } from "../../store/interval-rows.ts";

interface RecordedProcess {
  pid: number;
  startToken?: string;
}

/** The agent id inside a presence key. A key is an ENVIRONMENT wrapped around
 *  orch's opaque id, and the store is keyed by that id alone; a key that does not
 *  parse is already bare. Same resolution as `deriveLeasePayload` — reading the
 *  raw key here is what made close look up a row no writer ever produces. */
export function agentIdOf(key: string): string {
  return tryParseIdentity(key)?.id ?? key;
}

/** Read the launch identity from the normalized agent process interval. Presence
 * status carries liveness only and can never authorize a signal. */
function recordedProcess(key: string): RecordedProcess | null {
  try {
    const row = currentProcess(orchDir(), agentIdOf(key));
    if (row === undefined) return null;
    return { pid: row.pid, ...(row.startToken === null ? {} : { startToken: row.startToken }) };
  } catch {
    return null;
  }
}

/** Whether the recorded process instance is still present after a close attempt. */
function recordedProcessRemains(recorded: RecordedProcess): boolean {
  const startToken = recorded.startToken;
  if (typeof startToken !== "string") return processIsAlive(recorded.pid);
  const exited = retryingSync(
    "await closed process",
    () => !processInstanceMatches(recorded.pid, startToken),
    { attempts: 40, delayMs: 50, backoff: 1 },
    { sleepSync: sleepMs, retryOnResult: (value) => !value },
  );
  return !exited;
}

/** Close is the SECOND ending verb. Close ends the process; an `agent_endings` row
 *  is written, row and history stay, and
 *  only `reap` deletes. Deleting the hub row here cascaded away the agent's
 *  lease and its whole lease history — so a live orch's holding vanished the
 *  moment anyone closed the agent it drove, and retention (which sweeps ended
 *  rows) had nothing left to sweep. */
interface ClosedAgent {
  readonly key: string;
  readonly oldState: string;
}

function endClosedAgent(key: string): ClosedAgent | null {
  const root = orchDir();
  const agentId = agentIdOf(key);
  const row = agentById(root, agentId);
  if (row && !row.ending) {
    const by = selfId();
    endAgent(root, agentId, Date.now(), by !== undefined && agentById(root, by) ? by : null);
    const oldState = loadPresence(root).get(key)?.status?.state ?? "exited";
    return { key, oldState };
  }
  return null;
}

function publishClosedAgent(closed: ClosedAgent): void {
  void rpcCall(orchDir(), "agent-closed", closed).catch(() => { /* the daemon may not be running */ });
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

/** Whether the ENVIRONMENT still lists this handle (U1). A plexer with no
 *  inventory, or one this process is not inside a session of, was not asked and
 *  says nothing either way, so the recorded handle stands. */
function plexerStillHasPane(backend: Backend | null, handle: BackendHandle): boolean | null {
  const inventory = backend?.paneInventory;
  // No inventory, or no session to ask, is UNKNOWN — never evidence that a
  // handle exists. A missing handle is dealt with by the caller and never
  // reaches this function.
  if (!inventory || backend?.isInsideSession() !== true) return null;
  try {
    return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
  } catch {
    // A plexer that cannot answer has not said the pane is gone.
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
  readonly paneKnown: boolean;
}

/**
 * Every orch-managed record on this machine, before cmdClose filters it by close authority.
 *
 * Each row is read DIRECTLY, never resolved through a target string: resolution
 * is what makes a stale row ambiguous, and one unresolvable row must not abort
 * the sweep. A bulk close that closes nothing leaves every name reserved, which
 * is exactly when respawning is the only way out.
 */
function sweepTargets(): CloseTarget[] {
  const presence = presenceById();
  const targets: CloseTarget[] = [];
  for (const view of liveAgentViews(orchDir())) {
    const address = agentAddress(view, presence);
    const backend = getBackend(view.environment.plexer ?? "") ?? null;
    if (!backend) {
      lifecycleLogger(address).warn("close.unknown-backend", { backend: view.environment.plexer, handle: address });
      process.stdout.write(`skipping ${address}: unknown backend ${JSON.stringify(view.environment.plexer)} (reaping the record)\n`);
    }
    const handle = view.environment.handle;
    const paneState = handle === null ? false : plexerStillHasPane(backend, handle);
    targets.push({
      backend, handle, key: address, recorded: recordedProcess(address),
      // Unknown inventory still permits a real recorded handle to be handed to
      // the plexer; a null handle is never replaced with the agent id.
      paneKnown: handle !== null && paneState !== false,
    });
  }
  return targets;
}

/** Resolve the targets named on the command line. */
function namedTargets(positional: readonly string[]): CloseTarget[] {
  return positional.map((target) => {
    const resolved = resolveLifecycleTarget(target);
    // Never gated by the LEASE. Who may end this is close-authority.ts, applied in cmdClose.
    // `resolveLifecycleTarget` also supplies process-oriented fallbacks (pid/key).
    // Close may hand only the environment's actual pane handle to paneHost.
    const handle = resolved.view !== null ? resolved.view.environment.handle : resolved.entity.paneId;
    return {
      backend: resolved.backend,
      handle,
      key: resolved.key,
      recorded: recordedProcess(resolved.key),
      // A pane-capable backend's stale registry row may outlive its pane. Do
      // not invoke a provider with an opaque identity handle in that case.
      paneKnown: handle !== null && (resolved.backend.paneInventory === null || resolved.entity.paneId !== null),
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
 *  until that same (pid, start_token) is gone, not until kill(2) is accepted. */
function closeByProcess(recorded: RecordedProcess): CloseAttempt {
  try {
    process.kill(recorded.pid, "SIGTERM");
  } catch (error: unknown) {
    return { failure: errorMessage(error), signalled: false, closedByBackend: false, alreadyAbsent: false };
  }
  const failure = recordedProcessRemains(recorded) ? `process ${recorded.pid} is still running after SIGTERM` : null;
  return { failure, signalled: true, closedByBackend: false, alreadyAbsent: false };
}

/** A pane host owns closure when process identity is unavailable. */
function closeByPane(paneHost: PaneHostRole, handle: BackendHandle): CloseAttempt {
  try {
    paneHost.close(handle);
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

/** A plexer's successful close is not proof when its inventory can answer: verify
 *  the handle is really gone after every close attempt we can observe. */
function stillListed(target: CloseTarget): string | null {
  // An inventory that cannot see this session is UNKNOWN, so it cannot prove
  // that a successfully closed handle remains present.
  if (target.handle === null || !target.backend?.paneInventory || target.backend.isInsideSession() !== true) return null;
  const handle = target.handle;
  try {
    const listed = target.backend.paneInventory.list()
      .some((entry) => describeHandle(entry.handle) === describeHandle(handle));
    return listed === true
      ? `${describeHandle(handle)} is still listed by ${target.backend?.id ?? "the plexer"} after the close`
      : null;
  } catch (error: unknown) {
    return errorMessage(error);
  }
}

/** The one mechanism that can end this target, decided from the recorded
 *  process and the environment's pane role BEFORE anything is attempted. A
 *  variant carries what its own close needs, so the attempt re-derives nothing. */
type CloseRoute =
  | { readonly kind: "process"; readonly recorded: RecordedProcess }
  | { readonly kind: "pane"; readonly paneHost: PaneHostRole }
  | { readonly kind: "untokenized"; readonly pid: number }
  | { readonly kind: "none" };

function closeRoute(target: CloseTarget, paneHost: PaneHostRole | null): CloseRoute {
  // Narrowed to the RECORD OF A LIVE PROCESS in one step: a dead pid is the
  // same answer as no record at all, and every test below reads one value.
  const recorded = target.recorded !== null && processIsAlive(target.recorded.pid) ? target.recorded : null;
  const token = recorded !== null && typeof recorded.startToken === "string" ? recorded.startToken : null;
  if (recorded !== null && token !== null && processInstanceMatches(recorded.pid, token)) {
    return { kind: "process", recorded };
  }
  if (target.paneKnown && paneHost !== null) return { kind: "pane", paneHost };
  // A live process without a launch token cannot be safely signalled or
  // reaped: losing the row would make that process unreachable.
  if (recorded !== null) return { kind: "untokenized", pid: recorded.pid };
  return { kind: "none" };
}

function takeRoute(route: CloseRoute, handle: BackendHandle | null): CloseAttempt {
  switch (route.kind) {
    case "process": return closeByProcess(route.recorded);
    case "pane": return handle === null
      ? { failure: "pane route had no environment handle", signalled: false, closedByBackend: false, alreadyAbsent: false }
      : closeByPane(route.paneHost, handle);
    case "untokenized": return {
      failure: `process ${route.pid} is live but carries no start token, so orch cannot prove it is this agent`,
      signalled: false, closedByBackend: false, alreadyAbsent: false,
    };
    case "none": return { failure: null, signalled: false, closedByBackend: false, alreadyAbsent: false };
  }
}

/** End one agent by the strongest means available, and say what happened. */
function attemptClose(target: CloseTarget): CloseAttempt {
  const paneHost = target.backend?.paneHost ?? null;
  const paneCapable = target.paneKnown && paneHost !== null && target.handle !== null;
  const attempt = takeRoute(closeRoute(target, paneHost), target.handle);
  if (attempt.failure !== null || !paneCapable || attempt.alreadyAbsent) return attempt;
  const lingering = stillListed(target);
  return lingering === null ? attempt : { ...attempt, failure: lingering };
}

/** SIGTERM this session's `orch events` streams, never orch itself. */
function killEventStreams(): number {
  let pids: number[] = [];
  try {
    pids = execFileSync("pgrep", ["-f", "orch events"]).toString().trim().split("\n").filter(Boolean).map(Number);
  } catch { /* no stream running */ }
  const skip = new Set([process.pid, process.ppid]);
  const kill = pids.filter((pid) => !skip.has(pid));
  for (const pid of kill) { try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ } }
  return kill.length;
}

/** Close every target once, in order, recording an outcome for each.
 *
 *  Multi-target commands record one outcome per target with the real error text.
 *  Prose on stderr is not something a caller
 *  can act on, and a payload carrying only the successes cannot tell a full
 *  sweep from a half one. A target named twice is closed once. */
function closeEachTarget(targets: readonly CloseTarget[], json: boolean): { results: CloseOutcome[]; closed: string[]; ok: number } {
  const results: CloseOutcome[] = [];
  const closed: string[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.key)) continue;
    seen.add(target.key);
    const handle = target.handle === null ? null : describeHandle(target.handle);
    const { failure, signalled, closedByBackend } = attemptClose(target);
    if (failure !== null) {
      lifecycleLogger(target.key).error("close.failed", { handle, error: failure });
      results.push({ target: target.key, handle, outcome: "error", error: failure });
      process.stdout.write(`Could not close ${target.key}: ${failure}\n`);
      continue;
    }
    const ended = endClosedAgent(target.key);
    if (ended) publishClosedAgent(ended);
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
    if (!json) process.stdout.write(killed ? `Killed ${killed} orch events process(es).\n` : "No orch events stream running.\n");
  }
  if (json) process.stdout.write(JSON.stringify({ closed, results, requested, ok, stream }) + "\n");
  // `process.exitCode`, never `process.exit()`: the JSON above is buffered, and
  // exiting here truncates the very payload a caller reads to find out WHICH
  // target failed (src/commands/index.ts:272 states the same rule).
  if (requested && ok !== requested) process.exitCode = 1;
}

export function cmdClose(args: string[]) {
  const usage = "usage: orch close <target>... | --all [--stream] [--json]";
  const { enabled, positional } = splitOptionFlags(args, ["--all", "--stream", "--json"]);
  const all = enabled.has("--all");
  const stream = enabled.has("--stream");
  const json = enabled.has("--json");
  // Reject unknown flags before resolving or closing any preceding target.
  if (positional.some((argument) => argument.startsWith("--"))) die(usage);
  if (!all && !positional.length) die(usage);

  const authority = callerAuthority(selfIdentity());
  const named = namedTargets(positional);
  const refusal = named.map((target) => refuseClose(orchDir(), authority, agentIdOf(target.key))).find((reason) => reason !== null);
  if (refusal !== undefined && refusal !== null) die(refusal);
  // A sweep skips what is not the caller's; a named target is refused.
  const swept = all ? sweepTargets().filter((target) => refuseClose(orchDir(), authority, agentIdOf(target.key)) === null) : [];

  reportClose(closeEachTarget([...swept, ...named], json), { all, stream, json });
}

export function cmdAbort(args: string[]) {
  const json = args.includes("--json");
  const target = args.find((arg) => arg !== "--json" && arg !== "--force");
  if (!target) die("usage: orch abort <target> [--force] [--json]");
  // Abort is an unconditional ending operation: resolve from orch's registry so
  // a foreign-space target is still reachable, and never apply owner gates.
  const { backend, handle, entity } = resolveLifecycleTarget(target);
  const input = backend.paneInput;
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

