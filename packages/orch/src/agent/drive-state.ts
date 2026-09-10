// Ownership, and ownership only: who is driving one agent RIGHT NOW.
//
// Rule 11 keeps identity, provenance, ownership and environment apart, and makes
// ownership a lease held by a LIVE orch. This
// module answers that one question so the CLI table, the `--json` payload and
// the in-harness peer listing all read the same lease facts from the same
// place — a second copy would be a second truth about who owns an agent.
import { agentById } from "../store/agent-rows.ts";
import { currentLease } from "../store/lease-rows.ts";
import { orchDir } from "../presence/writer.ts";
import { recordedProcessIsLive } from "../store/interval-rows.ts";
import type { DriveState, DriveStateOptions } from "../types/agent.ts";


export const NO_ORCH_DRIVER = "no orch driving it";
export const DEAD_HOLDER_DRIVER = `${NO_ORCH_DRIVER} (holder gone)`;

const UNLEASED: DriveState = { kind: "unleased", owner: NO_ORCH_DRIVER, mine: false };
const HOLDER_GONE: DriveState = { kind: "unleased", owner: DEAD_HOLDER_DRIVER, mine: false };

/**
 * Who drives the agent this id addresses.
 *
 * The id is the whole address (Rule 11): nothing is split out of it, so an agent
 * that MOVED plexer or space still answers here, and a string carrying a place
 * addresses no agent rather than the one that used to sit there.
 *
 * Never throws: an unreadable store means orch cannot name a driver, and
 * "no orch driving it" is the honest answer — not a crash in a status listing.
 */
export function deriveDriveState(agentId: string, options: DriveStateOptions = {}): DriveState {
  try {
    const directory = options.directory ?? orchDir();
    const agent = agentById(directory, agentId);
    if (!agent) return UNLEASED;
    const lease = currentLease(directory, agent.id);
    if (!lease) return UNLEASED;
    // A dead holder is not a collision and is not an owner: the agent is
    // adoptable, and saying otherwise would hand it to a process that is gone.
    if (!recordedProcessIsLive(directory, lease.orchId)) return HOLDER_GONE;
    const holder = agentById(directory, lease.orchId);
    return {
      kind: "leased",
      owner: holder?.name ?? lease.orchId,
      mine: options.currentOrchId != null && lease.orchId === options.currentOrchId,
    };
  } catch {
    return UNLEASED;
  }
}
