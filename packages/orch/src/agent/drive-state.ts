import type { OrchDir } from "../types/core.ts";
// Ownership, and ownership only: who is driving one agent RIGHT NOW.
//
// Rule 11 keeps identity, provenance, ownership and environment apart, and makes
// ownership a lease held by a LIVE orch. This
// module answers that one question so the CLI table, the `--json` payload and
// the in-harness peer listing all read the same lease facts from the same
// place — a second copy would be a second truth about who owns an agent.
import { agentView } from "../store/agent-view.ts";
import { currentProcesses, recordedProcessIsLive, type ProcessRow } from "../store/interval-rows.ts";
import { recordedInstanceIsLive } from "../process-identity.ts";
import type { DriveState, DriveStateOptions } from "../types/agent.ts";
import type { AgentView } from "../types/store.ts";

type DriveStateInput = Omit<DriveStateOptions, "directory"> & { directory: OrchDir };

export const NO_ORCH_DRIVER = "no orch driving it";
export const DEAD_HOLDER_DRIVER = `${NO_ORCH_DRIVER} (holder gone)`;

const UNLEASED: DriveState = { kind: "unleased", owner: NO_ORCH_DRIVER, mine: false };
const HOLDER_GONE: DriveState = { kind: "unleased", owner: DEAD_HOLDER_DRIVER, mine: false };

/** What every reading of a lease needs: the composed views, and whether a holder's process runs. */
export interface LeaseFacts {
  readonly viewOf: (agentId: string) => AgentView | null;
  readonly holderAlive: (holderId: string) => boolean;
}

interface DriveFacts extends LeaseFacts {
  readonly currentOrchId: string | null | undefined;
}

/**
 * Who drives the agent this id addresses.
 *
 * The id is the whole address (Rule 11): nothing is split out of it, so an agent
 * that MOVED plexer or space still answers here, and a string carrying a place
 * addresses no agent rather than the one that used to sit there.
 */
function driveStateFrom(agentId: string, facts: DriveFacts): DriveState {
  const lease = facts.viewOf(agentId)?.heldBy;
  if (lease === null || lease === undefined) return UNLEASED;
  // A dead holder is not a collision and is not an owner: the agent is
  // adoptable, and saying otherwise would hand it to a process that is gone.
  if (!facts.holderAlive(lease.orchId)) return HOLDER_GONE;
  return {
    kind: "leased",
    owner: facts.viewOf(lease.orchId)?.name ?? lease.orchId,
    mine: facts.currentOrchId != null && lease.orchId === facts.currentOrchId,
  };
}

/** Lease facts for one agent, read from the store on demand. */
export function storeLeaseFacts(directory: OrchDir): LeaseFacts {
  return {
    viewOf: (id) => agentView(directory, id),
    holderAlive: (holderId) => recordedProcessIsLive(directory, holderId),
  };
}

/** Lease facts for the whole fleet from one read: the views passed in, the
 *  open processes read once, and each holder's liveness asked once. */
export function fleetLeaseFacts(directory: OrchDir, views: ReadonlyMap<string, AgentView>): LeaseFacts {
  // Read on the first holder asked about: a fleet with no lease opens no store.
  let processes: ReadonlyMap<string, ProcessRow> | undefined;
  const holderLiveness = new Map<string, boolean>();
  const holderAlive = (holderId: string): boolean => {
    const known = holderLiveness.get(holderId);
    if (known !== undefined) return known;
    processes ??= currentProcesses(directory);
    const recorded = processes.get(holderId);
    const alive = recorded !== undefined && recordedInstanceIsLive(recorded.pid, recorded.startToken);
    holderLiveness.set(holderId, alive);
    return alive;
  };
  return { viewOf: (id) => views.get(id) ?? null, holderAlive };
}

/** One agent's drive state, read from the store on demand.
 *  Never throws: an unreadable store means orch cannot name a driver, and
 *  "no orch driving it" is the honest answer — not a crash in a status listing. */
export function deriveDriveState(agentId: string, options: DriveStateInput): DriveState {
  try {
    return driveStateFrom(agentId, { ...storeLeaseFacts(options.directory), currentOrchId: options.currentOrchId });
  } catch {
    return UNLEASED;
  }
}

/** The whole fleet's drive states off {@link fleetLeaseFacts}. */
export function fleetDriveStates(directory: OrchDir, views: ReadonlyMap<string, AgentView>, currentOrchId: string | null | undefined): (agentId: string) => DriveState {
  const facts: DriveFacts = { ...fleetLeaseFacts(directory, views), currentOrchId };
  return (agentId) => driveStateFrom(agentId, facts);
}
