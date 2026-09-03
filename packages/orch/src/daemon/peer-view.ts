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
import type { DriveState } from "../types/agent.ts";

export interface PeerView {
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
function visibleKeys(orchDir: string, ownKey: string, keys: string[], allSpaces: boolean): string[] {
  const lookup = (id: string) => agentView(orchDir, id);
  if (!mayCrossFleets(orchDir, ownKey)) {
    return keys.filter((key) => isDescendantOf(lookup, key, ownKey));
  }
  return scopeToSpace(orchDir, keys, (key) => key, spaceOf(orchDir, ownKey), { all: allSpaces });
}

export function peerView(orchDir: string, ownKey: string, keys: string[], allSpaces: boolean): PeerView {
  const visible = visibleKeys(orchDir, ownKey, keys, allSpaces);
  const spaces: Record<string, string | null> = {};
  const drive: Record<string, DriveState> = {};
  for (const key of visible) {
    spaces[key] = spaceOf(orchDir, key);
    drive[key] = deriveDriveState(key, { directory: orchDir, currentOrchId: ownKey });
  }
  return { visible, spaces, drive };
}
