// The tabs of the caller's plexer, which runs on this machine, worked by orchd: listed, opened,
// renamed, closed, focused, and the tab a `tile` fills. Where the caller sits is the place orch
// recorded for it, never a probe of orchd's own environment.
import { selectBackend } from "./spawn/plan.ts";
import { callerSelf } from "./handlers/self.ts";
import { resolveLifecycleEntity } from "./handlers/resolve.ts";
import { paneHere } from "./handlers/pane.ts";
import { spaceListing } from "./handlers/space.ts";
import { agentViews } from "../../store/agent-view.ts";
import { placeHere } from "../../process-place.ts";
import { groupsNamed } from "../../groups.ts";
import { ambiguousTargetRefusal } from "../../refusal.ts";
import { sameSpace } from "../../shared/space.ts";
import type { Backend, BackendGroup, GroupHomeRole } from "../../types/backend.ts";
import type { CallerCredential } from "../../types/core.ts";
import type { ParamsOf, ResultOf, TabAction } from "../client/protocol.ts";
import type { DaemonState } from "./state.ts";

type TabResult = ResultOf<"tab">;

/** The credential a tab verb acts for. */
function credentialOf(caller: CallerCredential | undefined): CallerCredential {
  if (caller === undefined) throw new Error("a tab verb names its caller; this request carried no credential");
  return caller;
}

/** The plexer coordinate holding the caller's recorded place, or null for a caller in no place
 *  this plexer still lists. */
function callerCoordinate(state: DaemonState, backend: Backend, caller: CallerCredential): string | null {
  const environment = callerSelf(state.directory, { caller }).view?.environment;
  if (environment === undefined || environment.plexer !== backend.id || environment.handle === null) return null;
  return backend.placementInventory?.coordinateOf(environment.handle) ?? null;
}

/** A tab by id or label, else the tab holding the pane of the agent so named. */
export function resolveTabFor(state: DaemonState, backend: Backend, home: GroupHomeRole, caller: CallerCredential | undefined, target: string): BackendGroup {
  const groups = [...home.list()];
  if (!groups.length) throw new Error("No groups available.");
  const candidates = groupsNamed(groups, target);
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    state.services.logger.error("tabs.ambiguous", { target, candidates: candidates.map((group) => group.id).join(",") });
    throw ambiguousTargetRefusal(target, candidates.map((group) => ({ key: group.id, name: group.label ?? group.id, detail: null })));
  }
  // An agent's name stands for the group its pane is in, read from its plexer here.
  const resolved = resolveLifecycleEntity(state, { caller: credentialOf(caller), target });
  const plexer = resolved.view?.environment.plexer ?? resolved.entity.backend;
  if (plexer !== null && plexer !== backend.id) throw new Error(`Target "${target}" belongs to backend ${plexer}.`);
  if (resolved.place.kind === "host") throw new Error(`${target} runs on host ${resolved.place.host}, so no tab on this machine holds it`);
  const outcome = paneHere(state, placeHere(state.directory, resolved.key), { kind: "group" });
  const found = outcome.kind === "done" ? groups.find((group) => group.id === outcome.group) : undefined;
  if (!found) throw new Error(`No group found for target "${target}".`);
  return found;
}

/** Refuse a group-wide mutation while any pane in the group belongs to another holder. */
function assertGroupAgentsOwned(state: DaemonState, backend: Backend, caller: CallerCredential, group: string, steal: boolean): void {
  if (steal) return;
  const self = callerSelf(state.directory, { caller });
  const handles = new Set((backend.placementInventory?.list() ?? []).filter((pane) => pane.group === group).map((pane) => String(pane.handle)));
  for (const view of agentViews(state.directory)) {
    if (view.endedAt !== null) continue;
    // Ownership is the open lease; the pane handle is environment. A group is a set of
    // PLACES, so it is matched on the handle and refused on the lease.
    const holder = view.heldBy?.orchId;
    const handle = view.environment.handle;
    if (holder === null || holder === undefined || handle === null || !handles.has(handle)) continue;
    const owns = holder === self.id || (self.kind === "operator" && sameSpace(view.environment.space, self.space));
    if (!owns) throw new Error(`Group ${group} holds agent ${view.id} owned by ${holder}. Use --steal to override.`);
  }
}

/** The tabs in the caller's own home, or every tab with `all`. Outside a place, every tab. */
function listTabs(state: DaemonState, backend: Backend, home: GroupHomeRole, caller: CallerCredential, all: boolean): TabResult {
  const coordinate = all ? null : callerCoordinate(state, backend, caller);
  return { kind: "list", tabs: home.list().filter((tab) => coordinate === null || tab.workspace === coordinate) };
}

/** Open a tab in the named orch space's home, else beside the caller. */
function newTab(state: DaemonState, backend: Backend, home: GroupHomeRole, caller: CallerCredential, action: Extract<TabAction, { kind: "new" }>): TabResult {
  let coordinate: string | null;
  if (action.space === null) {
    coordinate = callerCoordinate(state, backend, caller);
    if (coordinate === null) throw new Error("Not inside a plexer home, so the tab has nowhere to open. Pass --space <space>.");
  } else {
    const listed = spaceListing(state.directory, { target: action.space, plexerId: backend.id });
    if (listed.home === null) return { kind: "answer", reason: "no-environment-role", text: `${listed.name} has no home in this environment; tab new does not apply.` };
    coordinate = listed.home;
  }
  const created = home.create({ workspace: coordinate, cwd: action.cwd, label: action.label });
  if (backend.placement) backend.placement.close(created.rootHandle);
  return { kind: "created", group: created.group, rootHandle: String(created.rootHandle) };
}

/** `tab`: one tab verb on the caller's plexer, the one settings name. */
export function tabVerb(state: DaemonState, params: ParamsOf<"tab">): TabResult {
  const backend = selectBackend(null, state.services.settings.current());
  const home = backend.groupHome;
  if (!home) return { kind: "answer", reason: "no-environment-role", text: "this environment does not provide groups" };
  const caller = credentialOf(params.caller);
  const action = params.action;
  if (action.kind === "list") return listTabs(state, backend, home, caller, action.all);
  if (action.kind === "new") return newTab(state, backend, home, caller, action);
  const tab = resolveTabFor(state, backend, home, caller, action.target);
  assertGroupAgentsOwned(state, backend, caller, tab.id, params.steal === true);
  switch (action.kind) {
    case "rename": home.rename(tab.id, action.label); break;
    case "close": home.close(tab.id); break;
    case "focus": home.focus(tab.id); break;
    default: {
      const exhaustive: never = action;
      throw new Error(`unknown tab action ${String(exhaustive)}`);
    }
  }
  return { kind: "done", tab: { id: tab.id, label: tab.label } };
}
