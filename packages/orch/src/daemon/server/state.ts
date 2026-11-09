import type { OrchDir } from "../../types/core.ts";
import { computeCodeHash } from "../client/process.ts";
import { fileURLToPath } from "node:url";
import { rpcCall } from "../client/rpc.ts";
import { agentViewIndex } from "../../store/agent-view.ts";
import { fleetLeaseFacts } from "../../agent/drive-state.ts";
import { bridgeAttached } from "../../control/bridge-links.ts";
import { buildFleetStatus } from "./fleet-status.ts";
import type { FleetStatus, RpcServer } from "../../types/daemon.ts";
import type { HeldPtysByPid, PtyHolder } from "../../types/pty.ts";
import type { SettingsWatch } from "../../types/settings.ts";
import type { DaemonServices } from "../../types/services.ts";
import type { WakeSignal } from "./wake.ts";
import { phaseClock } from "./phase-clock.ts";
import type { LoopWatchdog } from "./loop-watchdog.ts";
import type { HostLinks } from "../../hosts/link.ts";
import { recordedProcessIsLive } from "../../process-place.ts";

/** The one spelling of "is this lease's holder still running". A start token
 *  proves the pid is the SAME process instance, not a recycled number. */
/** Whether the orchestrator holding a lease is still alive. Rule 11: a dead
 *  holder is not a collision, so its lease must never gate a driving verb. */
export function leaseHolderIsAlive(directory: OrchDir, holderId: string): boolean {
  return recordedProcessIsLive(directory, holderId);
}

const entrypoint = process.env.ORCHD_ENTRYPOINT ?? fileURLToPath(import.meta.url);
export const bootCodeHash = computeCodeHash(entrypoint);
export const startedAt = new Date();
export interface DaemonState {
  readonly services: DaemonServices;
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
  /** The SSH links to every host settings names. */
  readonly hosts: HostLinks;
  /** The PTY of every agent this orchd runs as an interactive session. */
  readonly held: PtyHolder & HeldPtysByPid;
  fatalLogged: boolean;
}

/** The fleet as the daemon sees it, in orch's one status-row shape. Serving a reduced
 *  second shape here is what left the method unusable and every client reading files. */
export function fleetStatus(state: DaemonState, caller: string | null): FleetStatus {
  const directory = state.directory;
  const clock = phaseClock();
  const facts = fleetLeaseFacts(directory, agentViewIndex(directory));
  clock.lap("leases");
  const fleet = buildFleetStatus(state.services.settings.current(), { directory, leaseFacts: facts, caller, onPhase: (phase) => { clock.lap(phase); } });
  state.services.logger.trace("status.phases", clock.phases());
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
