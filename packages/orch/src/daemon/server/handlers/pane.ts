// The pane an agent sits in, worked where the agent runs: keys, focus, zoom, a label, a move to
// another group, or which group it is in. This orchd works panes on this machine through the
// agent's plexer; an agent on a linked host has its pane worked by that host's orchd.
import { resolveTargetRoute } from "../../../control/dispatch.ts";
import { normalizeControlTarget } from "../../../control/normalize-target.ts";
import { paneBoundary } from "../../../control/pane-boundary.ts";
import { describeHandle } from "../../../shared/plexer.ts";
import { readGroupLayout } from "../../../backends/tiling.ts";
import { openingPlacement, planTilePlacement } from "../../../shared/tiling.ts";
import { agentView, paneOf } from "../../../store/agent-view.ts";
import { setHandle } from "../../../store/interval-rows.ts";
import { hereOrNull, placeAgent } from "../../../process-place.ts";
import { ambiguousTargetRefusal } from "../../../refusal.ts";
import { groupsNamed } from "../../../groups.ts";
import { atAgentHost, driveOnHost } from "./host.ts";
import type { Backend, BackendHandle, BackendSplit, GroupHomeRole, TilePlacement } from "../../../types/backend.ts";
import type { PaneAction, PaneOutcome, ParamsOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";
import type { HereAgent } from "../../../types/agent-place.ts";

/** The group a pane is in, as its plexer lists it. */
function groupOf(backend: Backend, handle: BackendHandle): string | null {
  return backend.placementInventory?.list().find((item) => String(item.handle) === String(handle))?.group ?? null;
}

/** What a verb needs of the agent's place: its input, which an environment holding the agent's
 *  terminal has with no pane, or a pane its plexer lists. */
type PaneNeed = "input" | "pane";

/** Do `act` with the role a pane verb drives, or answer why the verb does not apply. An
 *  environment that lists no panes has none to show, focus, zoom or move. */
function onPane<T>(state: DaemonState, agent: HereAgent, command: string, need: PaneNeed, roleOf: (backend: Backend) => T | null, act: (role: T, handle: BackendHandle, backend: Backend) => string | null): PaneOutcome {
  const route = resolveTargetRoute(state.directory, agent);
  const role = route === undefined ? null : roleOf(route.backend);
  const pane = route === undefined || role === null ? null : { role, ...route };
  const placed = route !== undefined && (need === "input" || route.backend.placementInventory !== null);
  const plan = paneBoundary(agentView(state.directory, agent.id)?.name ?? agent.id, command, pane, placed);
  if (plan.outcome === "answer") return { kind: "answer", reason: plan.reason, text: plan.text };
  const { handle, backend } = plan.role;
  const group = act(plan.role.role, handle, backend);
  return { kind: "done", handle: describeHandle(handle), group };
}

/** The group a move lands in: one named by id or label, else the group of the agent so named,
 *  when that agent runs here: a pane on another host is in no group on this machine. */
function destinationGroup(state: DaemonState, backend: Backend, home: GroupHomeRole, tab: string): string {
  const candidates = groupsNamed(home.list(), tab);
  if (candidates.length > 1) throw ambiguousTargetRefusal(tab, candidates.map((group) => ({ key: group.id, name: group.label ?? group.id, detail: null })));
  const named = candidates[0];
  if (named !== undefined) return named.id;
  const namedAgent = hereOrNull(placeAgent(state.directory, normalizeControlTarget(state.directory, tab)));
  const handle = namedAgent === null ? null : paneOf(state.directory, namedAgent).handle;
  const group = handle === null ? null : groupOf(backend, handle);
  if (group === null) throw new Error(`No group found for target "${tab}".`);
  return group;
}

/** Where a pane should land in a group, ignoring the pane itself: a pane already in that group
 *  is never planned as its own split target. */
function placementBesides(state: DaemonState, backend: Backend, group: string, mover: BackendHandle): TilePlacement {
  const firstSplit = state.services.settings.current().tiling.first_split;
  const role = backend.groupLayout;
  if (!role) return openingPlacement(firstSplit);
  const layout = readGroupLayout(role, group);
  return planTilePlacement({ ...layout, placements: layout.placements.filter((place) => String(place.handle) !== String(mover)) }, firstSplit);
}

/** Move a pane to a group, or to a new one. The pane moved; the agent did not become another
 *  agent, so its handle interval closes and a new one opens. */
function movePane(state: DaemonState, agent: HereAgent, action: Extract<PaneAction, { kind: "move" }>, home: GroupHomeRole, handle: BackendHandle, backend: Backend): string | null {
  const group = action.tab === null ? null : destinationGroup(state, backend, home, action.tab);
  // Default: land on the destination group's biggest pane so it stays balanced; an explicit split wins.
  let split: BackendSplit = action.split ?? "right";
  let against: BackendHandle | undefined;
  if (action.split === null && group !== null) {
    const placement = placementBesides(state, backend, group, handle);
    split = placement.split;
    against = placement.targetHandle;
  }
  home.move({ handle, group, split, against, label: action.label });
  setHandle(state.directory, agent, Date.now(), String(handle));
  return group;
}

/** Work the pane of an agent this orchd runs. */
export function paneHere(state: DaemonState, agent: HereAgent, action: PaneAction): PaneOutcome {
  switch (action.kind) {
    case "keys":
      return onPane(state, agent, "keys", "input", (backend) => backend.agentInput, (input, handle) => { input.sendKeys(handle, action.keys); return null; });
    case "focus":
      return onPane(state, agent, "focus", "pane", (backend) => backend.agentInput, (input, handle) => { input.focus(handle); return null; });
    case "zoom":
      return onPane(state, agent, "zoom", "pane", (backend) => backend.zooming, (zoom, handle) => { zoom.setZoom(handle, action.mode); return null; });
    case "label":
      return onPane(state, agent, "rename --pane", "pane", (backend) => backend.labeling, (labeling, handle) => { labeling.setLabel(handle, action.label); return null; });
    case "move":
      return onPane(state, agent, "move", "pane", (backend) => backend.groupHome, (home, handle, backend) => movePane(state, agent, action, home, handle, backend));
    case "group":
      return onPane(state, agent, "tab", "pane", (backend) => backend.placementInventory, (_inventory, handle, backend) => groupOf(backend, handle));
    default: {
      const exhaustive: never = action;
      throw new Error(`unknown pane action ${String(exhaustive)}`);
    }
  }
}

/** `agent-pane`: work an agent's pane where it runs. A group read names a group on the agent's
 *  own host, so it is refused for an agent on another one: this machine's tabs do not hold it. */
export function paneAnywhere(state: DaemonState, params: ParamsOf<"agent-pane">): Promise<PaneOutcome> {
  const key = params.target;
  return atAgentHost(state, key, {
    here: (agent) => paneHere(state, agent, params.action),
    there: async (link, host) => {
      if (params.action.kind === "group") throw new Error(`${key} runs on host ${host.name}, so no tab on this machine holds it`);
      return (await driveOnHost(state, link, { action: "pane", key, pane: params.action, actor: params.actor ?? null })).outcome;
    },
  });
}
