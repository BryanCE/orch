import { getBackend } from "../backends/registry.ts";
import { lifecycleResolutionFor } from "./lifecycle.ts";
import { addressOf, indexPresenceById } from "../shared/lookup.ts";
import { callerAuthority, refuseClose, sweeps } from "../policy/close-authority.ts";
import { callerKindOf } from "../policy/caller.ts";
import { selfIdentityOf } from "../identity/self.ts";
import { agentView, liveAgentViews, paneOf } from "../store/agent-view.ts";
import { currentProcess } from "../store/interval-rows.ts";
import { hostById } from "../store/agent-rows.ts";
import { hostIdentity } from "../hosts/identity.ts";
import { hostOfPlace, placeAgentIfAny } from "../process-place.ts";
import { loadPresence } from "../presence/store.ts";
import type { Backend, BackendHandle } from "../types/backend.ts";
import type { ProcessInstance } from "../types/process.ts";
import type { HostIdentity } from "../types/host.ts";
import type { CallerCredential, OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { HereAgent } from "../types/agent-place.ts";

/** One agent a close may end, as orchd answers it: the backend by id, the handle, the recorded process. */
export interface CloseTargetWire {
  readonly key: string;
  readonly name: string;
  readonly backendId: string | null;
  readonly handle: string | null;
  /** The host the agent runs on, this machine included. */
  readonly host: HostIdentity;
  /** The recorded process, on `host`. Only an agent this orchd runs has one here; an agent
   *  on another host is that host's orchd's to end, over its link. */
  readonly recorded: ProcessInstance | null;
  readonly placeKnown: boolean;
}

/** Where a close target runs, read through the agent placed there. */
type TargetPlace = Pick<CloseTargetWire, "backendId" | "handle" | "recorded" | "host">;

/** The machine-specific half of an agent this orchd runs, read through its `HereAgent`: its
 *  pane, and the launch identity from its process interval. Presence status carries liveness
 *  only and can never authorize a signal. */
function hereTarget(orchDir: OrchDir, agent: HereAgent): TargetPlace {
  const pane = paneOf(orchDir, agent);
  const row = currentProcess(orchDir, agent);
  return { backendId: pane.plexer, handle: pane.handle, host: hostIdentity(), recorded: row === undefined ? null : { pid: row.pid, startToken: row.startToken } };
}

/** Where a close target runs. An agent here carries its pane and recorded process; one on
 *  another host carries only that host, whose orchd ends it over its link. A target with no
 *  agent row is a pane this machine's plexer listed (`listed`), so it is on this host. */
function targetPlace(orchDir: OrchDir, key: string, listed: Pick<CloseTargetWire, "backendId" | "handle">): TargetPlace {
  const place = placeAgentIfAny(orchDir, key);
  if (place === null) return { ...listed, host: hostIdentity(), recorded: null };
  if (place.kind === "here") return hereTarget(orchDir, place.agent);
  // `agent_hosts.host_id` references `hosts`, so the row is there.
  const host = hostById(orchDir, hostOfPlace(place));
  if (host === null) throw new Error(`${key} runs on host ${hostOfPlace(place)}, which the store does not hold`);
  return { backendId: null, handle: null, host, recorded: null };
}

type CloseWarn = (address: string, backendId: string | null) => void;

/** Render a native handle without falling back to Object.prototype.toString. */
function describeHandle(handle: BackendHandle): string {
  return typeof handle === "string" ? handle : handle.toString();
}

/** Whether the environment still lists this handle (U1). An environment that
 *  cannot answer says nothing either way, so the recorded handle stands. */
function plexerStillHasPane(backend: Backend | null, handle: BackendHandle): boolean | null {
  const inventory = backend?.placementInventory;
  if (!inventory) return null;
  try {
    return inventory.list().some((entry) => describeHandle(entry.handle) === describeHandle(handle));
  } catch {
    return null;
  }
}

/** Every live store record, before close authority filters it. */
function sweptCloseTargets(orchDir: OrchDir, warn: CloseWarn): CloseTargetWire[] {
  const presence = indexPresenceById(loadPresence(orchDir).values());
  return liveAgentViews(orchDir).map((view) => {
    const address = addressOf(view, presence);
    return closeTargetAt(view.name ?? address, address, targetPlace(orchDir, view.id, { backendId: null, handle: null }), warn);
  });
}

/** One live agent as a close target, from where it runs alone: no caller, no authority. An
 *  agent on another host has no pane here to check, and its close goes over the link. */
function closeTargetAt(name: string, address: string, place: TargetPlace, warn: CloseWarn): CloseTargetWire {
  const here = place.host.id === hostIdentity().id;
  const backend = place.backendId === null ? null : getBackend(place.backendId) ?? null;
  if (here && backend === null) warn(address, place.backendId);
  const paneState = place.handle === null ? false : plexerStillHasPane(backend, place.handle);
  return {
    ...place,
    key: address,
    name,
    // Unknown inventory still permits a real recorded handle to be handed to
    // the plexer; a null handle is never replaced with the agent id.
    placeKnown: place.handle !== null && paneState !== false,
  };
}

/** An agent this host runs, as a close target, for a close a linked host's orchd ruled on;
 *  null when it has no row or has already ended. */
export function closeTargetOfAgent(orchDir: OrchDir, agent: HereAgent, warn: CloseWarn): CloseTargetWire | null {
  const view = agentView(orchDir, agent.id);
  if (view?.endedAt !== null) return null;
  return closeTargetAt(view.name ?? agent.id, agent.id, hereTarget(orchDir, agent), warn);
}

/** Resolve targets named on the command line through the daemon's lifecycle seam. */
function namedCloseTargets(
  orchDir: OrchDir,
  settings: OrchSettings,
  credential: CallerCredential,
  positional: readonly string[],
): CloseTargetWire[] {
  return positional.map((target) => {
    const resolved = lifecycleResolutionFor(orchDir, settings, credential, target);
    const place = targetPlace(orchDir, resolved.key, { backendId: resolved.entity.backend, handle: resolved.entity.paneId });
    const backend = place.backendId === null ? null : getBackend(place.backendId) ?? null;
    return {
      ...place,
      key: resolved.key,
      name: resolved.view?.name ?? resolved.entity.name ?? resolved.key,
      // A pane-capable backend's stale registry row may outlive its pane. Do
      // not invoke a provider with an opaque identity handle in that case.
      placeKnown: backend !== null && place.handle !== null
        && (backend.placementInventory === null || resolved.entity.paneId !== null),
    };
  });
}

export function closeTargetsFor(
  orchDir: OrchDir,
  settings: OrchSettings,
  credential: CallerCredential,
  positional: readonly string[],
  all: boolean,
  warn: CloseWarn,
): { targets: CloseTargetWire[]; refusal: string | null } {
  const self = selfIdentityOf(orchDir, credential);
  const authority = callerAuthority(callerKindOf(orchDir, credential), self);
  if (authority === null) return { targets: [], refusal: "cannot close: this caller is not the human and has no orch row. Run orch whoami to register it, then retry." };
  const named = namedCloseTargets(orchDir, settings, credential, positional);
  const refusal = named
    .map((target) => refuseClose(orchDir, authority, target.key))
    .find((reason) => reason !== null) ?? null;
  if (refusal !== null) return { targets: [], refusal };
  // A sweep takes only the caller's own tree, the human's too; a named target is refused when not the caller's.
  const swept = all && self !== null
    ? sweptCloseTargets(orchDir, warn).filter((target) => sweeps(orchDir, self.id, target.key))
    : [];
  return { targets: [...swept, ...named], refusal: null };
}
