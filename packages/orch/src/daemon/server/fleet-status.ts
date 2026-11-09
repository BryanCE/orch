// The fleet status orchd answers `orch status` with: one row per agent, from its store.
import { fleetLeaseFacts } from "../../agent/drive-state.ts";
import type { LeaseFacts } from "../../shared/drive-state.ts";
import { buildEntities, sortEntities } from "../../entities/inventory.ts";
import { liveViews, agentViewIndex } from "../../store/agent-view.ts";
import { pendingQuestion } from "../../store/question-rows.ts";
import { askingHostNames } from "../../store/agent-rows.ts";
import { currentProcesses, type StoredProcess } from "../../store/interval-rows.ts";
import { hostOffline, linkedHosts } from "../../store/host-rows.ts";
import { hostOfPlace, placeAgentIfAny } from "../../process-place.ts";
import type { HostId } from "../../types/host.ts";
import type { LinkedHost } from "../../types/process.ts";
import { fleetNames, statusRowFromEntity, type RowProcess } from "./fleet-rows.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { AgentView } from "../../types/store.ts";
import type { OrchDir } from "../../types/core.ts";
import type { FleetStatus } from "../../types/daemon.ts";

interface FleetStatusOptions {
  /** Lease facts already read by the caller; read here when absent. */
  leaseFacts?: LeaseFacts;
  /** Resolve the store root once per fleet build (injectable for cost tests). */
  directory: OrchDir;
  caller: string | null;
  /** Called as each phase of the build ends, so orchd can log what a slow build spent. */
  onPhase?: (phase: string) => void;
}

/** Each agent row's open process, read once on the first row that has one, so a fleet with no rows opens no store.
 *  Only an agent here has a process here; one on another host is placed by that host, and
 *  carries whether that host's link is down. */
function processLookup(directory: OrchDir, views: ReadonlyMap<string, AgentView>): (agentId: string) => RowProcess | undefined {
  let processes: ReadonlyMap<string, StoredProcess> | undefined;
  let linked: ReadonlyMap<HostId, LinkedHost> | undefined;
  return (agentId) => {
    if (!views.has(agentId)) return undefined;
    linked ??= linkedHosts(directory);
    const place = placeAgentIfAny(directory, agentId, linked);
    if (place === null) return undefined;
    if (place.kind !== "here") return { pid: null, offline: hostOffline(directory, hostOfPlace(place)) };
    processes ??= currentProcesses(directory);
    return { pid: processes.get(agentId)?.pid ?? null, offline: null };
  };
}

export function buildFleetStatus(settings: OrchSettings, options: FleetStatusOptions): FleetStatus {
  const directory = options.directory;
  const fleet = agentViewIndex(directory);
  const views = liveViews(fleet);
  const leaseFacts = options.leaseFacts ?? fleetLeaseFacts(directory, fleet);
  const processOf = processLookup(directory, views);
  options.onPhase?.("index");
  const entities = sortEntities(buildEntities(directory, settings));
  options.onPhase?.("entities");
  const asking = askingHostNames(directory);
  const rows = entities.map((entity) => statusRowFromEntity(entity, views, leaseFacts, (id) => pendingQuestion(directory, id)?.question, processOf, (id) => asking.get(id) ?? null, directory, options.caller));
  options.onPhase?.("rows");
  // Names come off the whole index: an ended spawner or holder is still named.
  const names = fleetNames(rows, fleet, settings.spaces);
  options.onPhase?.("names");
  return { names, rows };
}
