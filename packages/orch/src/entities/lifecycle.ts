import { isAgentId } from "../shared/agent-id.ts";
import { buildEntities } from "./inventory.ts";
import { herePanes } from "../backends/pane-environment.ts";
import { viewForKey, addressOf, indexPresenceById } from "../shared/lookup.ts";
import { callerMayResolveFor, refuseForeignTarget } from "./resolve.ts";
import { loadPresence, spawnedRecords } from "../presence/store.ts";
import { ambiguousTargetRefusal, die } from "../refusal.ts";
import { errorMessage } from "../util.ts";
import type { Entity, OrchDir, CallerCredential } from "../types/core.ts";
import type { AgentView } from "../types/store.ts";
import type { AgentPane } from "../store/agent-view.ts";
import { type PresenceEntry, notDead } from "../types/presence.ts";
import type { OrchSettings } from "../types/settings.ts";

/** The pane of every agent that runs here, by id (`herePanes`). An agent on another host has
 *  no pane here, so no handle addresses it. */
type HerePanes = ReadonlyMap<string, AgentPane>;

/** Every spelling that addresses one agent: its minted id, its mutable name, or
 * its current pane handle when it runs here. Only the id is identity; the other two are
 * lookups, and the handle is environment — it changes when the agent moves. */
export function agentTargetMatches(view: AgentView, panes: HerePanes, target: string): boolean {
  return view.id === target || view.name === target || panes.get(view.id)?.handle === target;
}

export function resolveAgentView(
  views: readonly AgentView[],
  panes: HerePanes,
  presence: ReadonlyMap<string, PresenceEntry>,
  target: string,
): AgentView | undefined {
  const candidates = views.filter((view) => agentTargetMatches(view, panes, target)
    || addressOf(view, presence) === target);
  const live = candidates.filter((view) => notDead(presence.get(view.id)));
  const preferred = live.length > 0 ? live : candidates;
  if (preferred.length > 1) {
    throw ambiguousTargetRefusal(target, preferred.map((view) => ({ key: view.id, name: view.name, detail: null })));
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
  const liveDirect = direct.filter((entity) => notDead(entity.presence));
  const matches = liveDirect.length > 0 ? liveDirect : direct;
  if (matches.length > 1) {
    die(ambiguousTargetRefusal(target, matches.map((entity) => ({ key: entity.key, name: entity.name, detail: entity.tabLabel }))).message);
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
  panes: HerePanes,
  target: string,
): TargetResolution {
  const ent = directEntity(entities, target);
  if (!ent) return { ent: undefined, view: undefined };
  const view = viewForKey(views, ent.key);
  const canonical = canonicalForStalePane(entities, ent);
  if (!canonical) return { ent, view };
  return {
    ent: canonical,
    view: view ?? [...views.values()].find((row) => panes.get(row.id)?.handle === ent.paneId || row.name === target),
  };
}

/** Nothing in the inventory: resolve the composed agent, then re-link it to an
 *  entity when exactly one names it. */
function resolveFromViews(
  entities: readonly Entity[],
  views: ReadonlyMap<string, AgentView>,
  panes: HerePanes,
  presence: ReadonlyMap<string, PresenceEntry>,
  target: string,
): TargetResolution {
  let found: AgentView | undefined;
  try {
    found = resolveAgentView([...views.values()], panes, presence, target);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  if (!found) return { ent: undefined, view: undefined };
  const view = found;
  const address = addressOf(view, presence);
  const handle = panes.get(view.id)?.handle ?? null;
  const linked = entities.filter((candidate) => candidate.key === address
    || (handle !== null && candidate.paneId === handle)
    || candidate.name === view.name);
  return { ent: linked.length === 1 ? linked[0] : undefined, view };
}

/** An agent with no inventory entry is still closable: keep its composed facts
 *  and let the backend-native handle perform the cleanup. Only an agent here has a pane. */
function entityFromView(view: AgentView, pane: AgentPane | undefined, presence: ReadonlyMap<string, PresenceEntry>): Entity {
  return {
    key: addressOf(view, presence), paneId: pane?.handle ?? null, managed: true, name: view.name,
    ended: view.endedAt != null,
    tabLabel: null, agent: view.harnessId, focused: false, backendStatus: null,
    backend: pane?.plexer ?? null, presence: presence.get(view.id) ?? null,
    sessionPath: null, presenceOnly: true, space: view.environment.space, host: view.environment.host,
  };
}

/** The address orch reaches this agent by: its pane here, else the pane the inventory
 *  listed, else its identity. Process signaling is owned by the environment's process role,
 *  never a command-level pid handle. */
function lifecycleHandle(ent: Entity, pane: AgentPane | undefined): string {
  return pane?.handle ?? ent.paneId ?? ent.key;
}

/** What orchd resolves a lifecycle target to, for its own use. Only `entity`, `key` and `view`
 *  reach a caller; where the agent runs reaches it as a place, never as a backend. */
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
  const panes = herePanes(orchDir, views.keys());
  const entities = buildEntities(orchDir, settings, { skipBackends: true }).filter((entity) => callerMayResolveFor(orchDir, credential, entity));
  const inventory = resolveFromInventory(entities, views, panes, target);
  const composed = inventory.ent ? inventory : resolveFromViews(entities, views, panes, presence, target);
  const view = composed.view ?? (composed.ent ? viewForKey(views, composed.ent.key) : undefined);
  const ent = composed.ent
    ?? (composed.view ? entityFromView(composed.view, panes.get(composed.view.id), presence) : undefined);
  if (!ent) refuseForeignTarget(target);
  // Lifecycle resolution must obey the same open-lease wall as ordinary target
  // resolution. The operator remains unscoped so the human can still close a
  // foreign agent; a driving session gets the ordinary unknown-target refusal.
  if (!callerMayResolveFor(orchDir, credential, ent)) refuseForeignTarget(target);
  const pane = view === undefined ? undefined : panes.get(view.id);
  return {
    entity: ent,
    key: ent.key,
    view: view ?? null,
    backendId: pane?.plexer ?? ent.backend,
    handle: lifecycleHandle(ent, pane),
  };
}
