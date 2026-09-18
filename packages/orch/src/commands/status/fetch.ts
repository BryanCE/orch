import { runRemoteAsync } from "../../remote.ts";
import { readRpc } from "../daemon.ts";
import { isFleetStatus } from "../../daemon/client/protocol.ts";
import { warningStatusRow } from "./rows.ts";
import { buildFleetStatus } from "./offline.ts";
import { scopeFleetRows, statusRowMatches, displayStatusState } from "./options.ts";
import type { CallerScope, StatusOptions } from "./options.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { StatusRow } from "../../types/command.ts";
import type { FleetNames, FleetStatus } from "../../types/daemon.ts";
import type { DaemonClient } from "../../types/services.ts";

interface FleetSnapshot extends FleetStatus {
  agentsSeen: number;
  alive: number;
  /** Whether a backend inventory actually contributed rows to this snapshot. */
  backendAnswered: boolean;
}

export interface StatusResult extends FleetSnapshot {
  /** Whether the table needs the HOST column for a merged local/remote listing. */
  host: boolean;
}

const NO_NAMES: FleetNames = { agents: {}, spaces: {} };

export function normalizeStatusRow(row: StatusRow): StatusRow {
  return { ...row, state: displayStatusState(row) };
}

function snapshot(fleet: FleetStatus): FleetSnapshot {
  const normalized = fleet.rows.map(normalizeStatusRow);
  return {
    names: fleet.names,
    rows: normalized,
    agentsSeen: normalized.length,
    alive: normalized.filter((row) => row.alive).length,
    backendAnswered: normalized.some((row) => row.backend != null),
  };
}

async function readFleet(settings: OrchSettings | null, services: DaemonClient, offline: boolean): Promise<FleetSnapshot> {
  if (settings === null) return snapshot({ names: NO_NAMES, rows: [] });
  if (offline) return snapshot(buildFleetStatus(settings, { offline: true, directory: services.orchDir }));
  return snapshot(await readRpc(services, "status", undefined));
}

async function localStatus(settings: OrchSettings | null, services: DaemonClient, options: StatusOptions, caller?: CallerScope): Promise<FleetSnapshot> {
  const fleet = await readFleet(settings, services, options.offline);
  const scoped = scopeFleetRows(fleet.rows, { ...options, states: options.filter.states, caller });
  return { ...fleet, rows: scoped.map((row) => ({ ...row, host: "local" })) };
}

/** Ids are minted, so two hosts never share one: the maps union without collision. */
function mergeNames(all: readonly FleetNames[]): FleetNames {
  const agents: Record<string, string> = {};
  const spaces: Record<string, string> = {};
  for (const names of all) {
    Object.assign(agents, names.agents);
    Object.assign(spaces, names.spaces);
  }
  return { agents, spaces };
}

type RemoteStatusResult = Awaited<ReturnType<typeof runRemoteAsync>>;

async function remoteStatusResults(hosts: OrchSettings["hosts"], offline: boolean): Promise<{ name: string; result: RemoteStatusResult }[]> {
  return Promise.all(Object.entries(hosts).map(async ([name, host]) => ({
    name,
    result: await runRemoteAsync(name, host, ["status", ...(offline ? ["--offline"] : [])], { timeoutMs: host.timeout_ms }),
  })));
}

function remoteFleet(result: RemoteStatusResult): FleetStatus | null {
  return result.ok && isFleetStatus(result.value) ? result.value : null;
}

interface RemoteNarrowing {
  space?: string;
  agent?: string;
}

function remoteRowsFromResult(name: string, result: RemoteStatusResult, narrowing: RemoteNarrowing): StatusRow[] {
  if (!result.ok) return [warningStatusRow(name, result.failure.message)];
  const fleet = remoteFleet(result);
  if (fleet === null) return [warningStatusRow(name, `Host "${name}" returned an invalid status payload.`)];
  return fleet.rows.map((value) => normalizeStatusRow(value))
    .filter((row) => narrowing.space === undefined || row.spaceId === narrowing.space)
    .filter((row) => narrowing.agent === undefined || statusRowMatches(row, narrowing.agent))
    .map((row) => ({ ...row, host: name }));
}

function mergeRemoteStatusRows(local: readonly StatusRow[], remoteResults: readonly { name: string; result: RemoteStatusResult }[], narrowing: RemoteNarrowing): StatusRow[] {
  return [...local, ...remoteResults.flatMap(({ name, result }) => remoteRowsFromResult(name, result, narrowing))];
}

function remoteSummary(remoteResults: readonly { result: RemoteStatusResult }[]): { names: FleetNames; rows: StatusRow[]; alive: number; backendAnswered: boolean } {
  const fleets = remoteResults.map(({ result }) => remoteFleet(result)).filter((fleet): fleet is FleetStatus => fleet !== null);
  const rows = fleets.flatMap((fleet) => fleet.rows);
  return { names: mergeNames(fleets.map((fleet) => fleet.names)), rows, alive: rows.filter((row) => row.alive).length, backendAnswered: rows.some((row) => row.backend != null) };
}

export async function readStatusResult(
  services: DaemonClient,
  options: StatusOptions,
  caller: CallerScope,
): Promise<StatusResult> {
  const settings = services.settings.currentOrNull();
  const hosts = settings === null ? {} : settings.hosts;
  if (options.local || caller.kind !== "operator" || Object.keys(hosts).length === 0) {
    const local = await localStatus(settings, services, options, caller);
    return { ...local, host: false };
  }
  const localSnapshot = await localStatus(settings, services, options, caller);
  const remoteResults = await remoteStatusResults(hosts, options.offline);
  const rows = mergeRemoteStatusRows(localSnapshot.rows, remoteResults, { space: options.space, agent: options.agent });
  const remote = remoteSummary(remoteResults);
  return {
    names: mergeNames([localSnapshot.names, remote.names]),
    rows,
    agentsSeen: localSnapshot.agentsSeen + remote.rows.length,
    alive: localSnapshot.alive + remote.alive,
    backendAnswered: localSnapshot.backendAnswered || remote.backendAnswered,
    host: true,
  };
}
