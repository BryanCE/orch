import type { OrchDir } from "../types/core.ts";
// What one agent may see of another: the store decides existence and liveness; presence only adds display state.
import { deriveDriveState } from "../agent/drive-state.ts";
import { depthOf, isDescendantOf } from "../policy/provenance.ts";
import { scopeToSpace, spaceOf } from "../policy/space.ts";
import { agentView, liveAgentViews } from "../store/agent-view.ts";
import { agentProcessLive } from "../store/interval-rows.ts";
import { loadPresence } from "../presence/store.ts";
import type { DriveState } from "../types/agent.ts";
import type { JsonRecord } from "../types/core.ts";

export interface PeerViewPeer {
  key: string;
  name: string;
  harness: string;
  spawnedBy: string | null;
  status: JsonRecord | null;
}

export interface PeerView {
  /** Live peers visible to the caller, including the status fields agents render. */
  peers?: PeerViewPeer[];
  /** The subset of the requested keys this caller is allowed to see. */
  visible: string[];
  /** Each visible peer's space, and the drive state to render beside it. */
  spaces: Record<string, string | null>;
  drive: Record<string, DriveState>;
}

/** Only a root agent or an unregistered caller may lift the fleet wall. */
function mayCrossFleets(orchDir: OrchDir, callerId: string | null): boolean {
  if (callerId === null) return true;
  return depthOf((id) => agentView(orchDir, id), callerId) === 0;
}

/** Roots may request every space; a non-root caller sees its descendants and
 *  its ancestors — a reply to the spawner is the ancestor case. */
function visibleKeys(orchDir: OrchDir, ownKey: string, keys: string[], allSpaces: boolean, callerProject?: string): string[] {
  const lookup = (id: string) => agentView(orchDir, id);
  if (!mayCrossFleets(orchDir, ownKey)) {
    return keys.filter((key) => isDescendantOf(lookup, key, ownKey) || isDescendantOf(lookup, ownKey, key));
  }
  const scoped = scopeToSpace(orchDir, keys, (key) => key, spaceOf(orchDir, ownKey), { all: allSpaces });
  if (allSpaces || callerProject === undefined) return scoped;
  const presence = loadPresence(orchDir);
  return scoped.filter((key) => {
    const status = presence.get(key)?.status;
    return status === null || status === undefined || status.project === callerProject;
  });
}

export function peerView(orchDir: OrchDir, ownKey: string, keys: string[], allSpaces: boolean, callerProject?: string): PeerView {
  const presence = loadPresence(orchDir);
  const views = liveAgentViews(orchDir)
    .filter((view) => view.id !== ownKey && agentProcessLive(orchDir, view.id))
    .filter((view) => keys.length === 0 || keys.includes(view.id));
  const byKey = new Map(views.map((view) => [view.id, view]));
  const visible = visibleKeys(orchDir, ownKey, views.map((view) => view.id), allSpaces, callerProject);
  const peers: PeerViewPeer[] = visible.flatMap((key) => {
    const view = byKey.get(key);
    if (!view) return [];
    const status = presence.get(key)?.status;
    return [{
      key,
      name: view.name,
      harness: view.harnessId,
      spawnedBy: view.spawnedBy,
      status: status === null || status === undefined ? null : Object.fromEntries(Object.entries(status)),
    }];
  });
  const spaces: Record<string, string | null> = {};
  const drive: Record<string, DriveState> = {};
  for (const key of visible) {
    spaces[key] = spaceOf(orchDir, key);
    drive[key] = deriveDriveState(key, { directory: orchDir, currentOrchId: ownKey });
  }
  return { peers, visible, spaces, drive };
}
