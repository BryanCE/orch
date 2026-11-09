import { readRpc } from "../daemon.ts";
import { resolveEntity } from "../resolve.ts";
import { scopeFleetRows, displayStatusState } from "./options.ts";
import type { CallerScope, FleetScope, RootCount, RootTally, StatusOptions } from "./options.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { StatusRow } from "../../types/command.ts";
import type { FleetNames, FleetStatus } from "../../types/daemon.ts";
import type { DaemonClient } from "../../types/services.ts";

interface FleetSnapshot extends FleetStatus {
  agentsSeen: number;
  alive: number;
  otherLive: number;
  /** The live terminals and harness sessions, and whether the caller is one. */
  roots: RootTally;
  /** Whether a backend inventory actually contributed rows to this snapshot. */
  backendAnswered: boolean;
}

export interface StatusResult extends FleetSnapshot {
  /** Whether the table needs the HOST column: the fleet runs on more than one host. */
  host: boolean;
}

const NO_NAMES: FleetNames = { agents: {}, spaces: {} };

export function normalizeStatusRow(row: StatusRow): StatusRow {
  return { ...row, state: displayStatusState(row) };
}

/** The live roots of one kind, and whether the caller is one of them. */
function rootCount(rows: readonly StatusRow[], kind: "operator" | "session", callerId: string | null): RootCount {
  const live = rows.filter((row) => row.kind === kind && row.alive);
  const yours = live.some((row) => row.key === callerId);
  return { yours, others: live.length - (yours ? 1 : 0) };
}

/** The counts a status run reports about rows, as `callerId` sees them. */
export function rowCounts(rows: readonly StatusRow[], callerId: string | null): { alive: number; otherLive: number; roots: RootTally; backendAnswered: boolean } {
  return {
    alive: rows.filter((row) => row.alive).length,
    // Another orch's agents: spawned agents someone else holds. A terminal or a harness session
    // is a root, nobody's agent, so it is never counted as another orch's.
    otherLive: rows.filter((row) => row.kind === "agent" && row.managed && row.alive && !row.owned).length,
    roots: { terminals: rootCount(rows, "operator", callerId), sessions: rootCount(rows, "session", callerId) },
    backendAnswered: rows.some((row) => row.backend != null),
  };
}

function snapshot(fleet: FleetStatus, callerId: string | null): FleetSnapshot {
  const normalized = fleet.rows.map(normalizeStatusRow);
  return { names: fleet.names, rows: normalized, agentsSeen: normalized.length, ...rowCounts(normalized, callerId) };
}

async function readFleet(settings: OrchSettings | null, services: DaemonClient, caller: string | null): Promise<FleetSnapshot> {
  if (settings === null) return snapshot({ names: NO_NAMES, rows: [] }, caller);
  return snapshot(await readRpc(services, "status", { caller }), caller);
}

/** The row key `--agent` names, resolved once by orchd; undefined when no agent was named. */
export async function resolveStatusAgent(services: DaemonClient, options: StatusOptions): Promise<string | undefined> {
  if (options.agent === undefined) return undefined;
  return (await resolveEntity(services, options.agent, { all: options.all })).entity.key;
}

async function localStatus(settings: OrchSettings | null, services: DaemonClient, options: StatusOptions, scope: FleetScope): Promise<FleetSnapshot> {
  const fleet = await readFleet(settings, services, scope.caller?.id ?? null);
  return { ...fleet, rows: scopeFleetRows(fleet.rows, scope) };
}

/** The rows `status` keeps, from its flags, its caller, and the key `--agent` resolved to. */
function statusScope(options: StatusOptions, caller: CallerScope, agentKey: string | undefined): FleetScope {
  return {
    all: options.all,
    only: options.only,
    hide: options.hide.states,
    caller,
    ...(agentKey === undefined ? {} : { agentKey }),
    ...(options.space === undefined ? {} : { space: options.space }),
  };
}

export async function readStatusResult(
  services: DaemonClient,
  options: StatusOptions,
  caller: CallerScope,
  agentKey?: string,
): Promise<StatusResult> {
  const settings = services.settings.currentOrNull();
  const local = await localStatus(settings, services, options, statusScope(options, caller, agentKey));
  return { ...local, host: spansHosts(local.rows) };
}

/** A fleet whose agents run on more than one host needs the HOST column to tell them apart. */
function spansHosts(rows: readonly StatusRow[]): boolean {
  return new Set(rows.map((row) => row.host.id)).size > 1;
}
