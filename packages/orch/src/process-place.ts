// Where a recorded process runs, decided once. `placeProcess` is the only code that turns a
// `HostedProcess` into something orch can act on: a `LocalProcess` the OS here answers for,
// a process on a linked host that only its link may be asked about, or a process on a host
// orch has no way to reach. Liveness follows from the place: the OS here answers for its own
// processes; anywhere else it is unknown, which is never dead. An agent this orchd asked
// another host to run has no process here at all: its liveness is its host's link and its ending.
import { localProcessOf } from "./local-process.ts";
import { recordedInstanceIsLive } from "./process-identity.ts";
import { hostOffline, linkedHosts } from "./store/host-rows.ts";
import { agentById, hostOfAgent } from "./store/agent-rows.ts";
import { currentProcess } from "./store/interval-rows.ts";
import type { OrchDir } from "./types/core.ts";
import type { HostId } from "./types/host.ts";
import type { Liveness } from "./types/presence.ts";
import type { HostedProcess, LinkedHost, ProcessPlace } from "./types/process.ts";

/** Where a recorded process runs, from here. `linked` is {@link linkedHosts}, read once by a
 *  caller that places many processes. */
export function placeProcess(orchDir: OrchDir, process: HostedProcess, linked: ReadonlyMap<HostId, LinkedHost> = linkedHosts(orchDir)): ProcessPlace {
  const local = localProcessOf(process);
  if (local !== null) return { kind: "local", process: local };
  const host = linked.get(process.host);
  if (host !== undefined) return { kind: "linked", host, process };
  return { kind: "unreachable", process };
}

/** Whether a placed process is alive. Only the OS here can say; a process anywhere else is
 *  unknown, never dead. */
function livenessAt(place: ProcessPlace): Liveness {
  switch (place.kind) {
    case "local":
      return recordedInstanceIsLive(place.process) ? "alive" : "dead";
    case "linked":
    case "unreachable":
      return "unknown";
    default: {
      const exhaustive: never = place;
      throw new Error(`unknown process place ${String(exhaustive)}`);
    }
  }
}

/** Whether a recorded process is alive, wherever it runs. */
export function processLiveness(orchDir: OrchDir, process: HostedProcess, linked?: ReadonlyMap<HostId, LinkedHost>): Liveness {
  return livenessAt(placeProcess(orchDir, process, linked));
}

/** Whether an agent another host runs for this orchd is alive, read from here: alive while
 *  that host's link is up, its state then the latest its events said; unknown while the link
 *  is down. Never dead: only its ending says it is gone. */
export function hostedAgentLiveness(orchDir: OrchDir, host: HostId): Liveness {
  return hostOffline(orchDir, host) === null ? "alive" : "unknown";
}

/**
 * Whether the agent's OPEN process interval still names a live process.
 *
 * One spelling, imported: the lease gate (`orchd`), the drive-state renderer and
 * the doctor all ask this, and three copies of it is three chances to disagree
 * about whether a holder is dead — which is the difference between refusing a
 * dispatch and allowing it (Rule 11: a dead holder is not a collision).
 *
 * The recorded start token is checked against the live process, so a pid reused
 * by an unrelated process reads as DEAD. A process on a linked host orch cannot ask
 * about right now counts as live: unknown is never dead. An agent another host runs
 * for this orchd has no process here and is live until its ending is recorded.
 */
export function recordedProcessIsLive(orchDir: OrchDir, agentId: string): boolean {
  if (hostOfAgent(orchDir, agentId) !== null) return agentById(orchDir, agentId)?.ending === null;
  const row = currentProcess(orchDir, agentId);
  return row !== undefined && processLiveness(orchDir, row) !== "dead";
}

/** Asks a linked host, over its link, whether a process instance runs there. orchd sets it;
 *  anywhere else there is no link to ask, and the answer is no. */
export type LinkedProcessProbe = (host: LinkedHost, process: HostedProcess) => Promise<boolean>;

let linkedProbe: LinkedProcessProbe | null = null;

export function setLinkedProcessProbe(probe: LinkedProcessProbe | null): void {
  linkedProbe = probe;
}

/** Whether a placed process is alive, asked now: the OS here, or its host over the link. */
export async function processIsLiveNow(place: ProcessPlace): Promise<boolean> {
  switch (place.kind) {
    case "local":
      return recordedInstanceIsLive(place.process);
    case "linked":
      return linkedProbe === null ? false : linkedProbe(place.host, place.process);
    case "unreachable":
      return false;
    default: {
      const exhaustive: never = place;
      throw new Error(`unknown process place ${String(exhaustive)}`);
    }
  }
}
