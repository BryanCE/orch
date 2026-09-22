import type { OrchDir } from "../../types/core.ts";
import { computeCodeHash } from "../client/process.ts";
import { fileURLToPath } from "node:url";
import { rpcCall } from "../client/rpc.ts";
import { loadPresence } from "../../presence/store.ts";
import { agentViewIndex } from "../../store/agent-view.ts";
import { recordedProcessIsLive } from "../../store/interval-rows.ts";
import { fleetLeaseFacts } from "../../agent/drive-state.ts";
import { bridgeAttached } from "../../control/bridge-links.ts";
import { buildFleetStatus } from "../../commands/status/offline.ts";
import type { FleetStatus, RpcHandler, RpcHandlers, RpcServer } from "../../types/daemon.ts";
import type { SettingsWatch } from "../../types/settings.ts";
import type { Services } from "../../types/services.ts";
import type { WakeSignal } from "./wake.ts";
import type { LoopWatchdog } from "./loop-watchdog.ts";

/** The one spelling of "is this lease's holder still running". A start token
 *  proves the pid is the SAME process instance, not a recycled number. */
/** Whether the orchestrator holding a lease is still alive. Rule 11: a dead
 *  holder is not a collision, so its lease must never gate a driving verb. */
export function leaseHolderIsAlive(directory: OrchDir, holderId: string): boolean {
  return recordedProcessIsLive(directory, holderId);
}

export const entrypoint = process.env.ORCHD_ENTRYPOINT ?? fileURLToPath(import.meta.url);
export const bootCodeHash = computeCodeHash(entrypoint);
export const startedAt = new Date();
export interface DaemonState {
  readonly services: Services;
  readonly directory: OrchDir;
  readonly workController: AbortController;
  readonly wake: WakeSignal;
  server: RpcServer | undefined;
  workLoop: Promise<void> | undefined;
  workLoopRunning: boolean;
  outboxDrain: ReturnType<typeof setInterval> | undefined;
  livenessTick?: { stop(): void };
  loopWatchdog: LoopWatchdog | undefined;
  settingsWatch: SettingsWatch | undefined;
  lastActivityAt: number;
  fatalLogged: boolean;
}

/** The daemon owes its own exit: with nothing to serve, staying resident only
 *  accumulates orphaned processes. Live agents, event subscribers, or recent RPC
 *  traffic each count as being in use. */
export function idleShutdownDue(input: { idleMinutes: number; liveAgents: number; connections: number; msSinceActivity: number }): boolean {
  if (input.idleMinutes <= 0) return false;
  if (input.liveAgents > 0 || input.connections > 0) return false;
  return input.msSinceActivity >= input.idleMinutes * 60_000;
}

export function liveAgentCount(directory: OrchDir): number {
  return [...loadPresence(directory).values()].filter((entry) => entry.alive).length;
}

/** Every served call proves the daemon is in use; the idle clock restarts. */
export function touchHandler<M extends Exclude<keyof RpcHandlers, "register-session" | "claim-identity">>(state: DaemonState, handler: RpcHandler<M>): RpcHandler<M> {
  return (params, emit, context) => { state.lastActivityAt = Date.now(); return handler(params, emit, context); };
}

export function touchOnCall(state: DaemonState, handlers: RpcHandlers): RpcHandlers {
  return {
    "daemon-status": touchHandler(state, handlers["daemon-status"]),
    "subscribe-events": touchHandler(state, handlers["subscribe-events"]),
    "environment-labels": touchHandler(state, handlers["environment-labels"]),
    "peer-view": touchHandler(state, handlers["peer-view"]),
    notify: touchHandler(state, handlers.notify),
    "report-status": touchHandler(state, handlers["report-status"]),
    "report-result": touchHandler(state, handlers["report-result"]),
    "command-lock": touchHandler(state, handlers["command-lock"]),
    "command-unlock": touchHandler(state, handlers["command-unlock"]),
    enqueue: touchHandler(state, handlers.enqueue),
    status: touchHandler(state, handlers.status),
    attach: touchHandler(state, handlers.attach),
    dispatch: touchHandler(state, handlers.dispatch),
    steer: touchHandler(state, handlers.steer),
    message: touchHandler(state, handlers.message),
    answer: touchHandler(state, handlers.answer),
    "set-model": touchHandler(state, handlers["set-model"]),
    lifecycle: touchHandler(state, handlers.lifecycle),
    "spawn-headless": touchHandler(state, handlers["spawn-headless"]),
    "agent-closed": touchHandler(state, handlers["agent-closed"]),
    "register-agent": touchHandler(state, handlers["register-agent"]),
    detach: touchHandler(state, handlers.detach),
    adopt: touchHandler(state, handlers.adopt),
    rename: touchHandler(state, handlers.rename),
    reap: touchHandler(state, handlers.reap),
    "reap-candidates": touchHandler(state, handlers["reap-candidates"]),
    reclaim: touchHandler(state, handlers.reclaim),
    "set-handle": touchHandler(state, handlers["set-handle"]),
    spaces: touchHandler(state, handlers.spaces),
    space: touchHandler(state, handlers.space),
    "space-create": touchHandler(state, handlers["space-create"]),
    "space-rename": touchHandler(state, handlers["space-rename"]),
    "space-delete": touchHandler(state, handlers["space-delete"]),
    home: touchHandler(state, handlers.home),
    "record-home": touchHandler(state, handlers["record-home"]),
    "clear-home": touchHandler(state, handlers["clear-home"]),
    grants: touchHandler(state, handlers.grants),
    grant: touchHandler(state, handlers.grant),
    "admit-home": touchHandler(state, handlers["admit-home"]),
    "resolve-agent": touchHandler(state, handlers["resolve-agent"]),
    "queue-list": touchHandler(state, handlers["queue-list"]),
    "queue-cancel": touchHandler(state, handlers["queue-cancel"]),
    "queue-edit": touchHandler(state, handlers["queue-edit"]),
    "queue-take-on": touchHandler(state, handlers["queue-take-on"]),
    "queue-reap": touchHandler(state, handlers["queue-reap"]),
    "queue-intake": touchHandler(state, handlers["queue-intake"]),
    clean: touchHandler(state, handlers.clean),
    fleet: touchHandler(state, handlers.fleet),
    capacity: touchHandler(state, handlers.capacity),
    runs: touchHandler(state, handlers.runs),
    run: touchHandler(state, handlers.run),
    "agent-status": touchHandler(state, handlers["agent-status"]),
    "process-live": touchHandler(state, handlers["process-live"]),
    "resolve-target": touchHandler(state, handlers["resolve-target"]),
    self: touchHandler(state, handlers.self),
    "resolve-lifecycle": touchHandler(state, handlers["resolve-lifecycle"]),
    "close-targets": touchHandler(state, handlers["close-targets"]),
    "owned-agents": touchHandler(state, handlers["owned-agents"]),
    question: touchHandler(state, handlers.question),
    questions: touchHandler(state, handlers.questions),
    ack: touchHandler(state, handlers.ack),
    "control-outcome": touchHandler(state, handlers["control-outcome"]),
    reload: touchHandler(state, handlers.reload),
  };
}

/** The fleet as the daemon sees it, in orch's one status-row shape. Serving a reduced
 *  second shape here is what left the method unusable and every client reading files. */
export function fleetStatus(state: DaemonState): FleetStatus {
  const directory = state.directory;
  const facts = fleetLeaseFacts(directory, agentViewIndex(directory));
  const fleet = buildFleetStatus(state.services.settings.current(), { directory, leaseFacts: facts });
  return { names: fleet.names, rows: fleet.rows.map((row) => ({ ...row, bridgeAttached: bridgeAttached(row.key) })) };
}

export async function socketAnswers(directory: OrchDir): Promise<boolean> {
  try {
    await rpcCall(directory, "daemon-status", undefined, 200);
    return true;
  } catch {
    return false;
  }
}
