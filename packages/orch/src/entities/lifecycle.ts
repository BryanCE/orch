import { getBackend } from "../backends/registry.ts";
import { isAgentId } from "../backends/identity.ts";
import { buildEntities } from "./inventory.ts";
import { viewForKey, addressOf, indexPresenceById } from "./lookup.ts";
import { callerMayResolveFor, refuseForeignTarget } from "./resolve.ts";
import { loadPresence, spawnedRecords } from "../presence/store.ts";
import { ambiguousTargetRefusal, die } from "../refusal.ts";
import { errorMessage } from "../util.ts";
import type { Entity, OrchDir, CallerCredential } from "../types/core.ts";
import type { AgentView } from "../types/store.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { Backend } from "../types/backend.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { LifecycleTarget } from "../types/command.ts";

/** Every spelling that addresses one agent: its minted id, its mutable name, or
 * its current pane handle. Only the id is identity; the other two are lookups,
 * and the handle is environment — it changes when the agent moves. */
export function agentTargetMatches(view: AgentView, target: string): boolean {
  return view.id === target || view.name === target || view.environment.handle === target;
}

export function resolveAgentView(
  views: readonly AgentView[],
  presence: ReadonlyMap<string, PresenceEntry>,
  target: string,
): AgentView | undefined {
  const candidates = views.filter((view) => agentTargetMatches(view, target)
    || addressOf(view, presence) === target);
  const live = candidates.filter((view) => presence.get(view.id)?.alive === true);
  const preferred = live.length > 0 ? live : candidates;
  if (preferred.length > 1) {
    throw ambiguousTargetRefusal(target, preferred.map((view) => ({ key: view.id, detail: view.name })));
  }
  return preferred[0];
}

/** One resolution step's answer: the inventory row it found, the composed agent
 *  it found, or neither. Both halves travel together because a step can learn
 *  one without the other. */
interface TargetResolution {
  readonly ent: Entity | undefined;
  readonly view: AgentView | undefined;
}

/** A direct hit in the backend inventory — by key, pane id, or name. A live row
 *  beats a dead one; two live rows is an ambiguity, never a guess. */
function directEntity(entities: readonly Entity[], target: string): Entity | undefined {
  const direct = entities.filter((entity) => entity.key === target || entity.paneId === target || entity.name === target);
  const liveDirect = direct.filter((entity) => entity.presence?.alive === true);
  const matches = liveDirect.length > 0 ? liveDirect : direct;
  if (matches.length > 1) {
    die(ambiguousTargetRefusal(target, matches.map((entity) => ({ key: entity.key, detail: entity.tabLabel }))).message);
  }
  return matches[0];
}

/** A stale registry handle can make `buildEntities` expose the PANE ID as an
 *  entity's key. Prefer the bridge's canonical presence identity for that pane
 *  rather than carrying a malformed key onward. */
function canonicalForStalePane(entities: readonly Entity[], ent: Entity): Entity | undefined {
  const paneId = ent.paneId;
  if (isAgentId(ent.key) || !paneId) return undefined;
  return entities.find((candidate) => isAgentId(candidate.key)
    && candidate.paneId === paneId);
}

function resolveFromInventory(
  entities: readonly Entity[],
  views: ReadonlyMap<string, AgentView>,
  target: string,
): TargetResolution {
  const ent = directEntity(entities, target);
  if (!ent) return { ent: undefined, view: undefined };
  const view = viewForKey(views, ent.key);
  const canonical = canonicalForStalePane(entities, ent);
  if (!canonical) return { ent, view };
  return {
    ent: canonical,
    view: view ?? [...views.values()].find((row) => row.environment.handle === ent.paneId || row.name === target),
  };
}

/** Nothing in the inventory: resolve the composed agent, then re-link it to an
 *  entity when exactly one names it. */
function resolveFromViews(
  entities: readonly Entity[],
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
  target: string,
): TargetResolution {
  let found: AgentView | undefined;
  try {
    found = resolveAgentView([...views.values()], presence, target);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  if (!found) return { ent: undefined, view: undefined };
  const view = found;
  const address = addressOf(view, presence);
  const linked = entities.filter((candidate) => candidate.key === address
    || (view.environment.handle !== null && candidate.paneId === view.environment.handle)
    || candidate.name === view.name);
  return { ent: linked.length === 1 ? linked[0] : undefined, view };
}

/** An agent with no inventory entry is still closable: keep its composed facts
 *  and let the backend-native handle perform the cleanup. */
function entityFromView(view: AgentView, presence: ReadonlyMap<string, PresenceEntry>): Entity {
  return {
    key: addressOf(view, presence), paneId: view.environment.handle, managed: true, name: view.name,
    ended: view.endedAt != null,
    tabLabel: null, agent: view.harnessId, focused: false, backendStatus: null,
    backend: view.environment.plexer, presence: presence.get(view.id) ?? null,
    sessionPath: null, presenceOnly: true, space: view.environment.space,
  };
}

/** The address orch reaches this agent by: the composed handle, else the pane
 *  the inventory listed, else its identity. Process signaling is owned by the
 *  environment's process role, never a command-level pid handle. */
function lifecycleHandle(ent: Entity, view: AgentView | undefined): string {
  return view ? view.environment.handle ?? ent.paneId ?? ent.key : ent.paneId ?? ent.key;
}

/** What the resolver knows before a Backend object is attached: everything that travels over the wire. */
export interface LifecycleResolution {
  readonly entity: Entity;
  readonly key: string;
  readonly view: AgentView | null;
  readonly backendId: string | null;
  readonly handle: string;
}

export function lifecycleResolutionFor(orchDir: OrchDir, settings: OrchSettings, credential: CallerCredential, target: string): LifecycleResolution {
  const allViews = spawnedRecords(orchDir);
  const views = new Map([...allViews].filter(([key]) => callerMayResolveFor(orchDir, credential, { key })));
  const presence = indexPresenceById(loadPresence(orchDir).values());
  const entities = buildEntities(orchDir, settings, { skipBackends: true }).filter((entity) => callerMayResolveFor(orchDir, credential, entity));
  const inventory = resolveFromInventory(entities, views, target);
  const composed = inventory.ent ? inventory : resolveFromViews(entities, views, presence, target);
  const view = composed.view ?? (composed.ent ? viewForKey(views, composed.ent.key) : undefined);
  const ent = composed.ent
    ?? (composed.view ? entityFromView(composed.view, presence) : undefined);
  if (!ent) refuseForeignTarget(target);
  // Lifecycle resolution must obey the same open-lease wall as ordinary target
  // resolution. The operator remains unscoped so the human can still close a
  // foreign agent; a driving session gets the ordinary unknown-target refusal.
  if (!callerMayResolveFor(orchDir, credential, ent)) refuseForeignTarget(target);
  return {
    entity: ent,
    key: ent.key,
    view: view ?? null,
    backendId: view?.environment.plexer ?? ent.backend,
    handle: lifecycleHandle(ent, view),
  };
}

/** The Backend a resolution names, or the refusal that names the unknown id. */
export function lifecycleBackend(resolution: LifecycleResolution, target: string): Backend {
  const backend = resolution.backendId ? getBackend(resolution.backendId) : undefined;
  if (!backend) die(`Target "${target}" uses unknown backend ${JSON.stringify(resolution.backendId)}.`);
  return backend;
}

/**
 * Resolve lifecycle targets from orch's registry, not the current space.
 * Close is cleanup, so it must still resolve a dead or headless record after
 * the backend has stopped reporting the pane.
 */
export function resolveLifecycleTargetFor(orchDir: OrchDir, settings: OrchSettings, credential: CallerCredential, target: string): LifecycleTarget {
  const resolution = lifecycleResolutionFor(orchDir, settings, credential, target);
  return { ...resolution, backend: lifecycleBackend(resolution, target) };
}
