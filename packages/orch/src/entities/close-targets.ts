import { getBackend } from "../backends/registry.ts";
import { lifecycleResolutionFor } from "./lifecycle.ts";
import { addressOf, indexPresenceById } from "./lookup.ts";
import { callerAuthority, refuseClose, sweeps } from "../policy/close-authority.ts";
import { callerKindOf } from "../policy/caller.ts";
import { selfIdentityOf } from "../identity/self.ts";
import { agentView, liveAgentViews } from "../store/agent-view.ts";
import { currentProcess } from "../store/interval-rows.ts";
import { hostById, hostOfAgent } from "../store/agent-rows.ts";
import { loadPresence } from "../presence/store.ts";
import type { Backend, BackendHandle } from "../types/backend.ts";
import type { HostedProcess } from "../types/process.ts";
import type { CallerCredential, OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { AgentView } from "../types/store.ts";

/** One agent a close may end, as orchd answers it: the backend by id, the handle, the recorded process. */
export interface CloseTargetWire {
  readonly key: string;
  readonly name: string;
  readonly backendId: string | null;
  readonly handle: string | null;
  /** The recorded process, on the host it runs on. The closer signals it itself only when
   *  that host is its own box; any other host's process goes to orchd, over that host's link.
   *  Null for an agent another host runs for this orchd: its process is that host's. */
  readonly recorded: HostedProcess | null;
  /** The name of the host the agent runs on when that is not here, for what a close reports.
   *  Set with a null `recorded`, the agent is one another host runs for this orchd. */
  readonly hostName: string | null;
  readonly placeKnown: boolean;
}

/** Read the launch identity from the normalized agent process interval. Presence
 * status carries liveness only and can never authorize a signal. An agent another host
 * runs for this orchd is placed by that host alone. */
function recordedProcess(orchDir: OrchDir, key: string): Pick<CloseTargetWire, "recorded" | "hostName"> {
  try {
    const runsOn = hostOfAgent(orchDir, key);
    if (runsOn !== null) return { recorded: null, hostName: hostById(orchDir, runsOn)?.name ?? runsOn };
    const row = currentProcess(orchDir, key);
    if (row === undefined) return { recorded: null, hostName: null };
    const recorded: HostedProcess = { host: row.host, pid: row.pid, startToken: row.startToken };
    return { recorded, hostName: hostById(orchDir, row.host)?.name ?? null };
  } catch {
    return { recorded: null, hostName: null };
  }
}

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
function sweptCloseTargets(
  orchDir: OrchDir,
  settings: OrchSettings,
  credential: CallerCredential,
  warn: (address: string, backendId: string | null) => void,
): CloseTargetWire[] {
  void settings;
  void credential;
  const presence = indexPresenceById(loadPresence(orchDir).values());
  return liveAgentViews(orchDir).map((view) => closeTargetOfView(orchDir, view, addressOf(view, presence), warn));
}

/** One live agent as a close target, from its store record alone: no caller, no authority. */
function closeTargetOfView(orchDir: OrchDir, view: AgentView, address: string, warn: (address: string, backendId: string | null) => void): CloseTargetWire {
  const backendId = view.environment.plexer;
  const backend = backendId === null ? null : getBackend(backendId) ?? null;
  if (backend === null) warn(address, backendId);
  const handle = view.environment.handle;
  const paneState = handle === null ? false : plexerStillHasPane(backend, handle);
  return {
    backendId,
    handle,
    key: address,
    name: view.name ?? address,
    ...recordedProcess(orchDir, address),
    // Unknown inventory still permits a real recorded handle to be handed to
    // the plexer; a null handle is never replaced with the agent id.
    placeKnown: handle !== null && paneState !== false,
  };
}

/** An agent this host runs, as a close target, for a close a linked host's orchd ruled on;
 *  null when it has no row or has already ended. */
export function closeTargetOfAgent(orchDir: OrchDir, key: string, warn: (address: string, backendId: string | null) => void): CloseTargetWire | null {
  const view = agentView(orchDir, key);
  if (view?.endedAt !== null) return null;
  return closeTargetOfView(orchDir, view, key, warn);
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
    const backend = resolved.backendId === null ? null : getBackend(resolved.backendId) ?? null;
    const handle = resolved.view !== null ? resolved.view.environment.handle : resolved.entity.paneId;
    return {
      backendId: resolved.backendId,
      handle,
      key: resolved.key,
      name: resolved.view?.name ?? resolved.entity.name ?? resolved.key,
      ...recordedProcess(orchDir, resolved.key),
      // A pane-capable backend's stale registry row may outlive its pane. Do
      // not invoke a provider with an opaque identity handle in that case.
      placeKnown: backend !== null && handle !== null
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
  warn: (address: string, backendId: string | null) => void,
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
    ? sweptCloseTargets(orchDir, settings, credential, warn).filter((target) => sweeps(orchDir, self.id, target.key))
    : [];
  return { targets: [...swept, ...named], refusal: null };
}
