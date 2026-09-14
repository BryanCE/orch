import type { OrchDir } from "../../types/core.ts";
// What one agent may see of another: the store decides existence and liveness; presence only adds display state.
import { deriveDriveState } from "../../agent/drive-state.ts";
import { depthOf, isDescendantOf } from "../../policy/provenance.ts";
import { scopeToSpace, spaceOf } from "../../policy/space.ts";
import { agentView, liveAgentViews } from "../../store/agent-view.ts";
import { agentProcessLive } from "../../store/interval-rows.ts";
import { loadPresence } from "../../presence/store.ts";
import type { AgentStatusRow } from "../../store/status-rows.ts";
import type { DriveState } from "../../types/agent.ts";
import type { PeerStatus, PeerView, PeerViewPeer } from "../../types/daemon.ts";

/** Only a root agent or an unregistered caller may lift the fleet wall. */
function mayCrossFleets(orchDir: OrchDir, callerId: string | null): boolean {
  if (callerId === null) return true;
  return depthOf((id) => agentView(orchDir, id), callerId) === 0;
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
    return status === null || status === undefined || status.project === null || status.project === callerProject;
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
      status: status === null || status === undefined ? null : statusFields(status),
      result: presence.get(key)?.result ?? null,
    }];
  });
  const spaces: Record<string, string | null> = {};
  const drive: Record<string, DriveState> = {};
  for (const key of visible) {
    const space = spaceOf(orchDir, key);
    spaces[key] = space === undefined ? null : space;
    drive[key] = deriveDriveState(key, { directory: orchDir, currentOrchId: ownKey });
  }
  return { peers, visible, spaces, drive };
}
