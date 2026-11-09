// Ending one agent this host runs: by its place host, or by its recorded process instance.
// The CLI closes the agents its own box runs; orchd closes the ones a linked host asked it
// to run, with the same code, when that host's orchd asks over the link.
import { retryingSync } from "../retry.ts";
import { errorMessage } from "../util.ts";
import { getBackend } from "../backends/registry.ts";
import { describeHandle } from "../backends/backend.ts";
import { sleepMs } from "../backends/shell-ready.ts";
import { localProcessOf } from "../local-process.ts";
import type { CloseTargetWire } from "../entities/close-targets.ts";
import type { Backend, BackendHandle, PlacementRole, ProcessRole, LocalProcess } from "../types/backend.ts";

/** Whether the recorded process instance is still present after a close attempt.
 *  The environment that runs the process is the one asked whether it is gone. */
function processRemains(role: ProcessRole, recorded: LocalProcess): boolean {
  const exited = retryingSync(
    "await closed process",
    () => role.state(recorded) !== "alive",
    { attempts: 40, delayMs: 50, backoff: 1 },
    { sleepSync: sleepMs, retryOnResult: (value) => !value },
  );
  return !exited;
}

/** A close target's recorded process, from where this close runs. */
type RecordedHere =
  | { readonly kind: "none" }
  | { readonly kind: "here"; readonly process: LocalProcess }
  | { readonly kind: "elsewhere"; readonly hostName: string };

/** One agent a close was asked to end, with everything needed to end it. */
export interface CloseTarget {
  readonly backend: Backend | null;
  readonly name: string;
  /** The current environment handle, or null when the pane interval is closed. */
  readonly handle: BackendHandle | null;
  readonly key: string;
  /** Where the recorded process runs: here, where this close signals it itself, or on
   *  another host, where only orchd over that host's link may. */
  readonly recorded: RecordedHere;
  /** Whether a pane operation is meaningful here — false when the plexer no
   *  longer lists the handle (U1), so orch never asks it to close a lost pane. */
  readonly placeKnown: boolean;
}

/** How one target was ended, or why it could not be. `failure` is the REAL
 *  reason at each point it can go wrong, never one sentence covering all four. */
export interface CloseAttempt {
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
function closeByProcess(role: ProcessRole, recorded: LocalProcess): CloseAttempt {
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
  | { readonly kind: "process"; readonly role: ProcessRole; readonly recorded: LocalProcess }
  | { readonly kind: "none" };

/** Whoever HOLDS the agent ends it: a placed agent's recorded process is the
 *  place's own shell, which ignores SIGTERM, so its place host is asked first. */
function closeRoute(target: CloseTarget, placer: PlacementRole | null): CloseRoute {
  if (placer !== null && target.placeKnown && target.handle !== null) {
    return { kind: "pane", placer, handle: target.handle };
  }
  const role = target.backend?.process ?? null;
  if (target.recorded.kind !== "here" || role === null) return { kind: "none" };
  const recorded = target.recorded.process;
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
export function attemptClose(target: CloseTarget): CloseAttempt {
  const route = closeRoute(target, target.backend?.placement ?? null);
  const attempt = takeRoute(route);
  // Only a close the pane host was actually asked for is verified against it.
  if (attempt.failure !== null || route.kind !== "pane" || attempt.alreadyAbsent) return attempt;
  const lingering = stillListed(target);
  return lingering === null ? attempt : { ...attempt, failure: lingering };
}

function recordedHere(wire: CloseTargetWire): RecordedHere {
  if (wire.recorded === null) return wire.hostName === null ? { kind: "none" } : { kind: "elsewhere", hostName: wire.hostName };
  const local = localProcessOf(wire.recorded);
  if (local !== null) return { kind: "here", process: local };
  return { kind: "elsewhere", hostName: wire.hostName ?? wire.recorded.host };
}

export function closeTargetOf(wire: CloseTargetWire): CloseTarget {
  return {
    key: wire.key,
    name: wire.name,
    placeKnown: wire.placeKnown,
    backend: wire.backendId === null ? null : getBackend(wire.backendId) ?? null,
    handle: wire.handle,
    recorded: recordedHere(wire),
  };
}
