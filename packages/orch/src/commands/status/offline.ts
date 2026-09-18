// The only command file that opens the store.
// `--offline` and orchd read through it.
import { fleetLeaseFacts, type LeaseFacts } from "../../agent/drive-state.ts";
import { buildEntities, sortEntities } from "../../entities/inventory.ts";
import { indexPresenceById } from "../../entities/lookup.ts";
import { liveViews, agentViewIndex } from "../../store/agent-view.ts";
import { pendingQuestion } from "../../store/question-rows.ts";
import { loadPresence, spawnedRecords } from "../../presence/store.ts";
import { spawnerIdentity } from "../../policy/spawner.ts";
import { selfId, spaceOfAgent } from "../../identity/self.ts";
import { callerKind } from "../../policy/caller.ts";
import { fleetNames, statusRowFromEntity } from "./rows.ts";
import type { CallerScope } from "./options.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { AgentView } from "../../types/store.ts";
import type { PresenceEntry } from "../../types/presence.ts";
import type { OrchDir } from "../../types/core.ts";
import type { FleetStatus } from "../../types/daemon.ts";

export function currentOrchId(orchDir: OrchDir): string | null {
  return spawnerIdentity(orchDir).key;
}

interface FleetStatusOptions {
  offline?: boolean;
  /** Lease facts already read by the caller; read here when absent. */
  leaseFacts?: LeaseFacts;
  /** Resolve the store root once per fleet build (injectable for cost tests). */
  directory: OrchDir;
}

export function buildFleetStatus(settings: OrchSettings, options: FleetStatusOptions): FleetStatus {
  const directory = options.directory;
  const fleet = agentViewIndex(directory);
  const views = liveViews(fleet);
  const leaseFacts = options.leaseFacts ?? fleetLeaseFacts(directory, fleet);
  const rows = sortEntities(buildEntities(directory, settings, { skipBackends: options.offline === true }))
    .map((entity) => statusRowFromEntity(entity, views, leaseFacts, (id) => pendingQuestion(directory, id)?.question));
  // Names come off the whole index: an ended spawner or holder is still named.
  return { names: fleetNames(rows, fleet, settings.spaces), rows };
}

export function offlineCallerScope(orchDir: OrchDir): CallerScope {
  const kind = callerKind(orchDir);
  const id = selfId(orchDir) ?? null;
  return { id, ceiling: kind === "operator" || id === null ? null : spaceOfAgent(orchDir, id), kind };
}

export function offlineCapacityFleet(orchDir: OrchDir): { views: ReadonlyMap<string, AgentView>; presence: ReadonlyMap<string, PresenceEntry> } {
  return { views: spawnedRecords(orchDir), presence: indexPresenceById(loadPresence(orchDir).values()) };
}
