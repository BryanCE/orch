import { runRemoteAsync } from "../../remote.ts";
import { readRpc } from "../daemon.ts";
import { isDaemonStatusRow } from "../../daemon/client/protocol.ts";
import { warningStatusRow } from "./rows.ts";
import { fleetStatusRows } from "./offline.ts";
import { scopeFleetRows, statusRowMatches, displayStatusState } from "./options.ts";
import type { CallerScope, StatusOptions } from "./options.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { StatusRow } from "../../types/command.ts";
import type { DaemonClient } from "../../types/services.ts";

interface FleetSnapshot {
  rows: StatusRow[];
  agentsSeen: number;
  alive: number;
  /** Whether a backend inventory actually contributed rows to this snapshot. */
  backendAnswered: boolean;
}

export interface StatusResult extends FleetSnapshot {
  /** Whether the table needs the HOST column for a merged local/remote listing. */
  host: boolean;
}

export function normalizeStatusRow(row: StatusRow): StatusRow {
  return { ...row, state: displayStatusState(row) };
}

function snapshot(rows: StatusRow[], backendAnswered: boolean): FleetSnapshot {
  const normalized = rows.map(normalizeStatusRow);
  return {
    rows: normalized,
    agentsSeen: normalized.length,
    alive: normalized.filter((row) => row.alive).length,
    backendAnswered,
  };
}

async function readFleetRows(settings: OrchSettings | null, services: DaemonClient, spaces: OrchSettings["spaces"], offline: boolean): Promise<FleetSnapshot> {
  if (settings === null) return snapshot([], false);
  if (offline) {
    const rows = fleetStatusRows(settings, spaces, { offline: true, directory: services.orchDir });
    return snapshot(rows, rows.some((row) => row.backend != null));
  }
  const answer = await readRpc(services, "status", undefined);
  return snapshot(answer.rows, answer.rows.some((row) => row.backend != null));
}

async function localStatusRows(settings: OrchSettings | null, services: DaemonClient, options: StatusOptions, spaces: OrchSettings["spaces"], caller?: CallerScope): Promise<FleetSnapshot> {
  const snapshot = await readFleetRows(settings, services, spaces, options.offline);
  const scoped = scopeFleetRows(snapshot.rows, { ...options, states: options.filter.states, caller });
  return { ...snapshot, rows: scoped.map((row) => ({ ...row, host: "local" })) };
}

type RemoteStatusResult = Awaited<ReturnType<typeof runRemoteAsync>>;

async function remoteStatusResults(hosts: OrchSettings["hosts"], offline: boolean): Promise<{ name: string; result: RemoteStatusResult }[]> {
  return Promise.all(Object.entries(hosts).map(async ([name, host]) => ({
    name,
    result: await runRemoteAsync(name, host, ["status", ...(offline ? ["--offline"] : [])], { timeoutMs: host.timeout_ms }),
  })));
}

function validRemoteValues(result: RemoteStatusResult): StatusRow[] {
  if (!result.ok || !Array.isArray(result.value)) return [];
  return result.value.filter(isDaemonStatusRow);
}

interface RemoteNarrowing {
  space?: string;
  agent?: string;
}

function remoteRowsFromResult(name: string, result: RemoteStatusResult, narrowing: RemoteNarrowing): StatusRow[] {
  if (!result.ok) return [warningStatusRow(name, result.failure.message)];
  if (!Array.isArray(result.value)) return [warningStatusRow(name, `Host "${name}" returned an invalid status payload.`)];
  return validRemoteValues(result).map((value) => normalizeStatusRow(value))
    .filter((row) => narrowing.space === undefined || row.spaceId === narrowing.space)
    .filter((row) => narrowing.agent === undefined || statusRowMatches(row, narrowing.agent))
    .map((row) => ({ ...row, host: name }));
}

function mergeRemoteStatusRows(local: readonly StatusRow[], remoteResults: readonly { name: string; result: RemoteStatusResult }[], narrowing: RemoteNarrowing): StatusRow[] {
  return [...local, ...remoteResults.flatMap(({ name, result }) => remoteRowsFromResult(name, result, narrowing))];
}

function remoteSummary(remoteResults: readonly { result: RemoteStatusResult }[]): { rows: StatusRow[]; alive: number; backendAnswered: boolean } {
  const rows = remoteResults.flatMap(({ result }) => validRemoteValues(result));
  return { rows, alive: rows.filter((row) => row.alive).length, backendAnswered: rows.some((row) => row.backend != null) };
}

export async function readStatusResult(
  services: DaemonClient,
  options: StatusOptions,
  caller: CallerScope,
): Promise<StatusResult> {
  const settings = services.settings.currentOrNull();
  const hosts = settings === null ? {} : settings.hosts;
  const spaces = settings === null ? {} : settings.spaces;
  if (options.local || caller.kind !== "operator" || Object.keys(hosts).length === 0) {
    const local = await localStatusRows(settings, services, options, spaces, caller);
    return { ...local, host: false };
  }
  const localSnapshot = await localStatusRows(settings, services, options, spaces, caller);
  const remoteResults = await remoteStatusResults(hosts, options.offline);
  const rows = mergeRemoteStatusRows(localSnapshot.rows, remoteResults, { space: options.space, agent: options.agent });
  const remote = remoteSummary(remoteResults);
  return {
    rows,
    agentsSeen: localSnapshot.agentsSeen + remote.rows.length,
    alive: localSnapshot.alive + remote.alive,
    backendAnswered: localSnapshot.backendAnswered || remote.backendAnswered,
    host: true,
  };
}
