import { getBackend } from "../backends/registry.ts";
import { lifecycleResolutionFor } from "./lifecycle.ts";
import { addressOf, indexPresenceById } from "./lookup.ts";
import { callerAuthority, refuseClose } from "../policy/close-authority.ts";
import { selfIdentityOf } from "../identity/self.ts";
import { liveAgentViews } from "../store/agent-view.ts";
import { currentProcess } from "../store/interval-rows.ts";
import { loadPresence } from "../presence/store.ts";
import type { Backend, BackendHandle, RecordedProcess } from "../types/backend.ts";
import type { CallerCredential, OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";

/** One agent a close may end, as orchd answers it: the backend by id, the handle, the recorded process. */
export interface CloseTargetWire {
  readonly key: string;
  readonly backendId: string | null;
  readonly handle: string | null;
  readonly recorded: RecordedProcess | null;
  readonly placeKnown: boolean;
}

/** Read the launch identity from the normalized agent process interval. Presence
 * status carries liveness only and can never authorize a signal. */
function recordedProcess(orchDir: OrchDir, key: string): RecordedProcess | null {
  try {
    const row = currentProcess(orchDir, key);
    return row === undefined ? null : { pid: row.pid, startToken: row.startToken };
  } catch {
    return null;
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
  const targets: CloseTargetWire[] = [];
  for (const view of liveAgentViews(orchDir)) {
    const address = addressOf(view, presence);
    const backendId = view.environment.plexer;
    const backend = backendId === null ? null : getBackend(backendId) ?? null;
    if (backend === null) warn(address, backendId);
    const handle = view.environment.handle;
    const paneState = handle === null ? false : plexerStillHasPane(backend, handle);
    targets.push({
      backendId,
      handle,
      key: address,
      recorded: recordedProcess(orchDir, address),
      // Unknown inventory still permits a real recorded handle to be handed to
      // the plexer; a null handle is never replaced with the agent id.
      placeKnown: handle !== null && paneState !== false,
    });
  }
  return targets;
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
      recorded: recordedProcess(orchDir, resolved.key),
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
  const authority = callerAuthority(selfIdentityOf(orchDir, credential));
  const named = namedCloseTargets(orchDir, settings, credential, positional);
  const refusal = named
    .map((target) => refuseClose(orchDir, authority, target.key))
    .find((reason) => reason !== null) ?? null;
  if (refusal !== null) return { targets: [], refusal };
  // A sweep skips what is not the caller's; a named target is refused.
  const swept = all
    ? sweptCloseTargets(orchDir, settings, credential, warn)
      .filter((target) => refuseClose(orchDir, authority, target.key) === null)
    : [];
  return { targets: [...swept, ...named], refusal: null };
}
