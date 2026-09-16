import type { OrchDir } from "../../types/core.ts";
// What one agent may see of another: the store decides existence and liveness; presence only adds display state.
import { fleetDriveStates } from "../../agent/drive-state.ts";
import { depthOf, isDescendantOf } from "../../policy/provenance.ts";
import { scopeToSpace, spaceOfIn, type SpaceLookup } from "../../policy/space.ts";
import { agentViewIndex } from "../../store/agent-view.ts";
import { loadPresence } from "../../presence/store.ts";
import type { AgentStatusRow } from "../../store/status-rows.ts";
import type { DriveState } from "../../types/agent.ts";
import type { PeerStatus, PeerView, PeerViewPeer } from "../../types/daemon.ts";
import type { ProvenanceLookup } from "../../types/policy.ts";
import type { AgentView } from "../../types/store.ts";
import type { PresenceEntry } from "../../types/presence.ts";

/** The fleet, read once per view: every agent composed, and its presence. */
interface Fleet {
  readonly views: ReadonlyMap<string, AgentView>;
  readonly presence: ReadonlyMap<string, PresenceEntry>;
  readonly lookup: ProvenanceLookup;
  readonly spaceOf: SpaceLookup;
}

function readFleet(orchDir: OrchDir): Fleet {
  const views = agentViewIndex(orchDir);
  return { views, presence: loadPresence(orchDir), lookup: (id) => views.get(id), spaceOf: spaceOfIn(views) };
}

/** Only a root agent or an unregistered caller may lift the fleet wall. */
function mayCrossFleets(fleet: Fleet, callerId: string | null): boolean {
  if (callerId === null) return true;
  return depthOf(fleet.lookup, callerId) === 0;
}

function statusFields(status: AgentStatusRow): PeerStatus {
  return {
    state: status.state,
    task: status.task,
    lastText: status.lastText,
    modelId: status.modelId,
    thinking: status.thinking,
    contextPercent: status.contextPercent,
    sessionPath: status.sessionPath,
    project: status.project,
  };
}

/** Roots may request every space; a non-root caller sees its descendants and
 *  its ancestors — a reply to the spawner is the ancestor case. */
function visibleKeys(fleet: Fleet, ownKey: string, keys: string[], allSpaces: boolean, callerProject?: string): string[] {
  if (!mayCrossFleets(fleet, ownKey)) {
    return keys.filter((key) => isDescendantOf(fleet.lookup, key, ownKey) || isDescendantOf(fleet.lookup, ownKey, key));
  }
  const scoped = scopeToSpace(fleet.spaceOf, keys, (key) => key, fleet.spaceOf(ownKey), { all: allSpaces });
  if (allSpaces || callerProject === undefined) return scoped;
  return scoped.filter((key) => {
    const status = fleet.presence.get(key)?.status;
    return status === null || status === undefined || status.project === null || status.project === callerProject;
  });
}

export function peerView(orchDir: OrchDir, ownKey: string, keys: string[], allSpaces: boolean, callerProject?: string): PeerView {
  const fleet = readFleet(orchDir);
  const views = [...fleet.views.values()]
    .filter((view) => view.id !== ownKey && fleet.presence.get(view.id)?.alive === true)
    .filter((view) => keys.length === 0 || keys.includes(view.id));
  const byKey = new Map(views.map((view) => [view.id, view]));
  const visible = visibleKeys(fleet, ownKey, views.map((view) => view.id), allSpaces, callerProject);
  const peers: PeerViewPeer[] = visible.flatMap((key) => {
    const view = byKey.get(key);
    if (!view) return [];
    const status = fleet.presence.get(key)?.status;
    return [{
      key,
      name: view.name,
      harness: view.harnessId,
      spawnedBy: view.spawnedBy,
      status: status === null || status === undefined ? null : statusFields(status),
      result: fleet.presence.get(key)?.result ?? null,
    }];
  });
  const driveState = fleetDriveStates(orchDir, fleet.views, ownKey);
  const spaces: Record<string, string | null> = {};
  const drive: Record<string, DriveState> = {};
  for (const key of visible) {
    spaces[key] = fleet.spaceOf(key);
    drive[key] = driveState(key);
  }
  return { peers, visible, spaces, drive };
}
