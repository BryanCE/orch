// The only command file that opens the store.
// `--offline` and orchd read through it.
import { fleetLeaseFacts, type LeaseFacts } from "../../agent/drive-state.ts";
import { buildEntities, sortEntities } from "../../entities/inventory.ts";
import { indexPresenceById } from "../../entities/lookup.ts";
import { liveViews, agentViewIndex } from "../../store/agent-view.ts";
import { pendingQuestion } from "../../store/question-rows.ts";
import { loadPresence, spawnedRecords } from "../../presence/store.ts";
import { selfId, spaceOfAgent } from "../../identity/self.ts";
import { callerKind } from "../../policy/caller.ts";
import { currentProcesses, type ProcessRow } from "../../store/interval-rows.ts";
import { hostById } from "../../store/agent-rows.ts";
import { fleetNames, statusRowFromEntity, type RowProcess } from "./rows.ts";
import type { CallerScope } from "./options.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { AgentView } from "../../types/store.ts";
import type { PresenceEntry } from "../../types/presence.ts";
import type { OrchDir } from "../../types/core.ts";
import type { FleetStatus } from "../../types/daemon.ts";

export function currentOrchId(orchDir: OrchDir): string | null {
  return selfId(orchDir) ?? null;
}

interface FleetStatusOptions {
  offline?: boolean;
  /** Lease facts already read by the caller; read here when absent. */
  leaseFacts?: LeaseFacts;
  /** Resolve the store root once per fleet build (injectable for cost tests). */
  directory: OrchDir;
  caller: string | null;
  /** Called as each phase of the build ends, so orchd can log what a slow build spent. */
  onPhase?: (phase: string) => void;
}

/** Each agent row's open process, read once on the first row that has one, so a fleet with no rows opens no store. */
function processLookup(directory: OrchDir, views: ReadonlyMap<string, AgentView>): (agentId: string) => RowProcess | undefined {
  let processes: ReadonlyMap<string, ProcessRow> | undefined;
  return (agentId) => {
    if (!views.has(agentId)) return undefined;
    processes ??= currentProcesses(directory);
    const process = processes.get(agentId);
    return process && { pid: process.pid, host: hostById(directory, process.hostId)?.name };
  };
}

export function buildFleetStatus(settings: OrchSettings, options: FleetStatusOptions): FleetStatus {
  const directory = options.directory;
  const fleet = agentViewIndex(directory);
  const views = liveViews(fleet);
  const leaseFacts = options.leaseFacts ?? fleetLeaseFacts(directory, fleet);
  const processOf = processLookup(directory, views);
  options.onPhase?.("index");
  const entities = sortEntities(buildEntities(directory, settings, { skipBackends: options.offline === true }));
  options.onPhase?.("entities");
  const rows = entities.map((entity) => statusRowFromEntity(entity, views, leaseFacts, (id) => pendingQuestion(directory, id)?.question, processOf, directory, options.caller));
  options.onPhase?.("rows");
  // Names come off the whole index: an ended spawner or holder is still named.
  const names = fleetNames(rows, fleet, settings.spaces);
  options.onPhase?.("names");
  return { names, rows };
}

export function offlineCallerScope(orchDir: OrchDir): CallerScope {
  const kind = callerKind(orchDir);
  const id = selfId(orchDir) ?? null;
  return { id, ceiling: kind === "operator" || id === null ? null : spaceOfAgent(orchDir, id), kind };
}

export function offlineCapacityFleet(orchDir: OrchDir): { views: ReadonlyMap<string, AgentView>; presence: ReadonlyMap<string, PresenceEntry> } {
  return { views: spawnedRecords(orchDir), presence: indexPresenceById(loadPresence(orchDir).values()) };
}
