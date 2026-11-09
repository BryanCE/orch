import { readRpc } from "../daemon.ts";
import { resolveEntity } from "../resolve.ts";
import { scopeFleetRows, displayStatusState } from "./options.ts";
import type { CallerScope, FleetScope, StatusOptions } from "./options.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { StatusRow } from "../../types/command.ts";
import type { FleetNames, FleetStatus } from "../../types/daemon.ts";
import type { DaemonClient } from "../../types/services.ts";

interface FleetSnapshot extends FleetStatus {
  agentsSeen: number;
  alive: number;
  otherLive: number;
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

/** The counts a status run reports about rows. */
function rowCounts(rows: readonly StatusRow[]): { alive: number; otherLive: number; backendAnswered: boolean } {
  return {
    alive: rows.filter((row) => row.alive).length,
    otherLive: rows.filter((row) => row.managed && row.alive && !row.owned).length,
    backendAnswered: rows.some((row) => row.backend != null),
  };
}

function snapshot(fleet: FleetStatus): FleetSnapshot {
  const normalized = fleet.rows.map(normalizeStatusRow);
  return { names: fleet.names, rows: normalized, agentsSeen: normalized.length, ...rowCounts(normalized) };
}

async function readFleet(settings: OrchSettings | null, services: DaemonClient, caller: string | null): Promise<FleetSnapshot> {
  if (settings === null) return snapshot({ names: NO_NAMES, rows: [] });
  return snapshot(await readRpc(services, "status", { caller }));
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
