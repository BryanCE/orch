// What one agent may see of another, answered by the daemon.
//
// A bundled harness links no store (T5), but peer listing needs three facts that
// only the store holds: the provenance wall, the space wall, and who drives each
// peer. The agent still finds its peers itself — enumerating presence is orch's
// own mechanism and needs no database — and asks here only for the judgements.
//
// The project filter deliberately stays with the agent: it compares a peer's
// reported project against the CALLER's own working tree, which is the caller's
// fact and not a row.
import { deriveDriveState } from "../agent/drive-state.ts";
import { depthOf, isDescendantOf } from "../policy/provenance.ts";
import { scopeToSpace, spaceOf } from "../policy/space.ts";
import { agentView } from "../store/agent-view.ts";
import { loadPresence } from "../presence/store.ts";
import type { DriveState } from "../types/agent.ts";
import type { JsonRecord } from "../types/core.ts";

export interface PeerViewPeer {
  key: string;
  status: JsonRecord;
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
function mayCrossFleets(orchDir: string, callerId: string | null): boolean {
  if (callerId === null) return true;
  return depthOf((id) => agentView(orchDir, id), callerId) === 0;
}

/** Roots may request every space; a deeper caller stays inside its own
 *  provenance subtree however the all-spaces flag is set. */
function visibleKeys(orchDir: string, ownKey: string, keys: string[], allSpaces: boolean, callerProject?: string): string[] {
  const lookup = (id: string) => agentView(orchDir, id);
  if (!mayCrossFleets(orchDir, ownKey)) {
    return keys.filter((key) => isDescendantOf(lookup, key, ownKey));
  }
  const scoped = scopeToSpace(orchDir, keys, (key) => key, spaceOf(orchDir, ownKey), { all: allSpaces });
  if (allSpaces || callerProject === undefined) return scoped;
  const presence = loadPresence(orchDir);
  return scoped.filter((key) => presence.get(key)?.status?.project === callerProject);
}

export function peerView(orchDir: string, ownKey: string, keys: string[], allSpaces: boolean, callerProject?: string): PeerView {
  const presence = loadPresence(orchDir);
  const requestedKeys = keys.length > 0 ? keys : [...presence.keys()];
  const liveKeys = requestedKeys.filter((key) => key !== ownKey && presence.get(key)?.alive === true && presence.get(key)?.status !== null);
  const visible = visibleKeys(orchDir, ownKey, liveKeys, allSpaces, callerProject);
  const peers: PeerViewPeer[] = visible.flatMap((key) => {
    const status = presence.get(key)?.status;
    return status === null || status === undefined ? [] : [{ key, status: Object.fromEntries(Object.entries(status)) }];
  });
  const spaces: Record<string, string | null> = {};
  const drive: Record<string, DriveState> = {};
  for (const key of visible) {
    spaces[key] = spaceOf(orchDir, key);
    drive[key] = deriveDriveState(key, { directory: orchDir, currentOrchId: ownKey });
  }
  return { peers, visible, spaces, drive };
}
