// Where a recorded process runs, and where an agent runs, decided once.
//
// `placeProcess` is the only code that turns a `HostedProcess` into something orch can act
// on: a `LocalProcess` the OS here answers for, a process on a linked host that only its link
// may be asked about, or a process on a host orch has no way to reach. It places a caller's
// process; the OS on this box answers for its own pids and, from inside WSL, the Windows
// side's too.
//
// `placeAgent` places an agent, from its open `agent_hosts` row, and is the only code that
// mints a `HereAgent`. Here means this orchd's own host (`hostIdentity().id`) and nothing
// wider: the other OS side of the same box runs its own orchd with its own store, so an agent
// there is that orchd's to act on, reached over a link when one is configured and refused
// otherwise. Liveness follows from the place: this orchd answers for its own agents'
// processes; anywhere else it is unknown, which is never dead.
import { localProcessOf } from "./local-process.ts";
import { recordedInstanceIsLive } from "./process-identity.ts";
import { hostIdentity } from "./hosts/identity.ts";
import { agentIdFromRow } from "./shared/agent-id.ts";
import { hostOffline, linkedHosts } from "./store/host-rows.ts";
import { agentById, agentHost, hostById } from "./store/agent-rows.ts";
import { agentLocation, agentLocations, currentProcess, type StoredProcess } from "./store/interval-rows.ts";
import type { OrchDir } from "./types/core.ts";
import type { HostId } from "./types/host.ts";
import type { Liveness } from "./types/presence.ts";
import type { HostedProcess, LinkedHost, ProcessPlace } from "./types/process.ts";
import type { AgentId, AgentLocation, AgentPlace, HereAgent } from "./types/agent-place.ts";

/** Where a recorded process runs, from here. `linked` is {@link linkedHosts}, read once by a
 *  caller that places many processes. */
export function placeProcess(orchDir: OrchDir, process: HostedProcess, linked: ReadonlyMap<HostId, LinkedHost> = linkedHosts(orchDir)): ProcessPlace {
  const local = localProcessOf(process);
  if (local !== null) return { kind: "local", process: local };
  const host = linked.get(process.host);
  if (host !== undefined) return { kind: "linked", host, process };
  return { kind: "unreachable", process };
}

function isHere(agent: { readonly id: AgentId; readonly host: HostId }): agent is HereAgent {
  return agent.host === hostIdentity().id;
}

/** Where an agent runs, from its open host row: here on this orchd's own host, on a linked
 *  host, or on a host this orchd cannot reach. `linked` is {@link linkedHosts}, read once by a
 *  caller that places many agents. */
export function placeLocation(id: string, location: AgentLocation, linked: ReadonlyMap<HostId, LinkedHost>): AgentPlace {
  const agent = agentIdFromRow(id);
  const candidate = { id: agent, host: location.host };
  if (isHere(candidate)) return { kind: "here", agent: candidate };
  const host = linked.get(location.host);
  return host === undefined ? { kind: "unreachable", agent, host: location.host } : { kind: "linked", agent, host };
}

/** Where an agent runs. Total for every agent the store holds; an unknown id throws. */
export function placeAgent(orchDir: OrchDir, id: string, linked: ReadonlyMap<HostId, LinkedHost> = linkedHosts(orchDir)): AgentPlace {
  return placeLocation(id, agentHost(orchDir, id), linked);
}

/** Where an agent runs, or null when the store holds no agent with this id. */
export function placeAgentIfAny(orchDir: OrchDir, id: string, linked?: ReadonlyMap<HostId, LinkedHost>): AgentPlace | null {
  const location = agentLocation(orchDir, id);
  if (location === undefined) return agentById(orchDir, id) === null ? null : placeAgent(orchDir, id, linked);
  return placeLocation(id, location, linked ?? linkedHosts(orchDir));
}

/** The agent with this id, when the store holds it and it runs here; null otherwise. */
export function hereAgentIfAny(orchDir: OrchDir, id: string): HereAgent | null {
  const place = placeAgentIfAny(orchDir, id);
  return place === null ? null : hereOrNull(place);
}

/** Every agent among `ids` that runs here, placed in one read of the open host rows. An agent
 *  on another host, and an id the store does not hold, is left out. */
export function hereAgents(orchDir: OrchDir, ids: Iterable<string>): HereAgent[] {
  const locations = agentLocations(orchDir);
  const linked = linkedHosts(orchDir);
  const here: HereAgent[] = [];
  for (const id of ids) {
    const location = locations.get(id);
    const agent = location === undefined ? null : hereOrNull(placeLocation(id, location, linked));
    if (agent !== null) here.push(agent);
  }
  return here;
}

/** The agent, when it runs here; null when it runs on another host. */
export function hereOrNull(place: AgentPlace): HereAgent | null {
  return place.kind === "here" ? place.agent : null;
}

/** The host an agent runs on, from any place. */
export function hostOfPlace(place: AgentPlace): HostId {
  switch (place.kind) {
    case "here":
      return place.agent.host;
    case "linked":
      return place.host.id;
    case "unreachable":
      return place.host;
    default: {
      const exhaustive: never = place;
      throw new Error(`unknown agent place ${String(exhaustive)}`);
    }
  }
}

/** An agent that must run here, for code that only ever acts on its own agents: a spawn this
 *  orchd just recorded, a process it holds. One on another host is refused by name. */
export function placeHere(orchDir: OrchDir, id: string): HereAgent {
  const place = placeAgent(orchDir, id);
  if (place.kind === "here") return place.agent;
  const host = hostOfPlace(place);
  throw new Error(`${id} runs on host ${hostById(orchDir, host)?.name ?? host}, not on this one; only that host's orchd acts on it`);
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

/** Whether an agent is alive, read from here. Here: its recorded process, and none is dead.
 *  On a linked host: alive while that host's link is up, its state then the latest its events
 *  said; unknown while the link is down. On a host orch cannot reach: unknown. Never dead
 *  anywhere but here: only its ending says an agent elsewhere is gone. */
export function agentLiveness(orchDir: OrchDir, place: AgentPlace, linked?: ReadonlyMap<HostId, LinkedHost>): Liveness {
  return placedLiveness(orchDir, place, place.kind === "here" ? currentProcess(orchDir, place.agent) : undefined, linked);
}

/** {@link agentLiveness}, for a fleet reader that read every process here in one query:
 *  `process` is the agent's open process when it runs here. */
export function placedLiveness(orchDir: OrchDir, place: AgentPlace, process: StoredProcess | undefined, linked?: ReadonlyMap<HostId, LinkedHost>): Liveness {
  switch (place.kind) {
    case "here":
      return process === undefined ? "dead" : processLiveness(orchDir, process, linked);
    case "linked":
      return hostOffline(orchDir, place.host.id) === null ? "alive" : "unknown";
    case "unreachable":
      return "unknown";
    default: {
      const exhaustive: never = place;
      throw new Error(`unknown agent place ${String(exhaustive)}`);
    }
  }
}

/**
 * Whether an agent counts as live: the one spelling the lease gate (`orchd`), the
 * drive-state renderer and the doctor all ask, so they never disagree about whether a
 * holder is dead — which is the difference between refusing a dispatch and allowing it
 * (Rule 11: a dead holder is not a collision).
 *
 * An agent here is live while its recorded process instance is: the start token is checked,
 * so a pid reused by an unrelated process reads as DEAD. An agent on another host is live
 * until its ending is recorded: unknown is never dead. An id the store does not hold is not live.
 */
export function recordedProcessIsLive(orchDir: OrchDir, agentId: string, linked?: ReadonlyMap<HostId, LinkedHost>): boolean {
  const place = placeAgentIfAny(orchDir, agentId, linked);
  if (place === null) return false;
  if (place.kind === "here") return hereIsLive(orchDir, place.agent);
  return agentById(orchDir, agentId)?.ending === null;
}

/** Whether an agent this orchd runs is live: its recorded process instance is, start token
 *  checked. The OS here answers for it. */
export function hereIsLive(orchDir: OrchDir, agent: HereAgent): boolean {
  return agentLiveness(orchDir, { kind: "here", agent }) !== "dead";
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
