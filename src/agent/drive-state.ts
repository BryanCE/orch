// Ownership, and ownership only: who is driving one agent RIGHT NOW.
//
// TASKS/01-agent-model.md Rule 11 keeps identity, provenance, ownership and
// environment apart, and makes ownership a lease held by a LIVE orch. This
// module answers that one question so the CLI table, the `--json` payload and
// the in-harness peer listing all read the same lease facts from the same
// place — a second copy would be a second truth about who owns an agent.
import { tryParseIdentity } from "../backends/identity.ts";
import { agentById } from "../store/agent-rows.ts";
import { currentLease } from "../store/lease-rows.ts";
import { openStore } from "../store/connection.ts";
import { orchDir } from "../presence/store.ts";
import { isRecord } from "../util.ts";
import { processInstanceMatches, processIsAlive } from "../process-identity.ts";

/** What a reader is told about who drives an agent. `owner` is the human
 *  spelling for both cases, so no renderer has to compose the sentence. */
export interface DriveState {
  kind: "leased" | "unleased";
  owner: string;
  mine: boolean;
}

export interface DriveStateOptions {
  directory?: string;
  /** Raw agents.id for the caller, supplied by the current session identity. */
  currentOrchId?: string | null;
}

interface HolderProcessRow {
  pid: number;
  start_token: string | null;
}

function isHolderProcessRow(value: unknown): value is HolderProcessRow {
  return isRecord(value)
    && typeof value.pid === "number"
    && (value.start_token === null || typeof value.start_token === "string");
}

function holderIsAlive(directory: string, holderId: string): boolean {
  const row = openStore(directory)
    .query("SELECT pid, start_token FROM agent_processes WHERE agent_id = ? AND until IS NULL")
    .get(holderId);
  if (!isHolderProcessRow(row)) return false;
  if (row.start_token !== null && row.start_token.length > 0) return processInstanceMatches(row.pid, row.start_token);
  return processIsAlive(row.pid);
}

export const NO_ORCH_DRIVER = "no orch driving it";
export const DEAD_HOLDER_DRIVER = `${NO_ORCH_DRIVER} (holder gone)`;

const UNLEASED: DriveState = { kind: "unleased", owner: NO_ORCH_DRIVER, mine: false };
const HOLDER_GONE: DriveState = { kind: "unleased", owner: DEAD_HOLDER_DRIVER, mine: false };

/** The agents.id an agent key addresses. A serialized identity carries it in its
 *  id segment; a key that is already a bare minted id IS the answer. Nothing else
 *  in the key is identity (Rule 11), so nothing else is consulted. */
function addressedAgentId(key: string): string {
  return tryParseIdentity(key)?.id ?? key;
}

/**
 * Who drives the agent this key addresses.
 *
 * Never throws: an unreadable store means orch cannot name a driver, and
 * "no orch driving it" is the honest answer — not a crash in a status listing.
 */
export function deriveDriveState(key: string, options: DriveStateOptions = {}): DriveState {
  try {
    const directory = options.directory ?? orchDir();
    const agent = agentById(directory, addressedAgentId(key));
    if (!agent) return UNLEASED;
    const lease = currentLease(directory, agent.id);
    if (!lease) return UNLEASED;
    // A dead holder is not a collision and is not an owner: the agent is
    // adoptable, and saying otherwise would hand it to a process that is gone.
    if (!holderIsAlive(directory, lease.orchId)) return HOLDER_GONE;
    return {
      kind: "leased",
      owner: lease.orchId,
      mine: options.currentOrchId != null && lease.orchId === options.currentOrchId,
    };
  } catch {
    return UNLEASED;
  }
}
