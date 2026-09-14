import type { OrchDir, Entity } from "../types/core.ts";
import { allBackends } from "../backends/registry.ts";
import { loadPresence } from "../presence/store.ts";
import { spaceOf } from "../policy/space.ts";
import { agentViewIndex } from "../store/agent-view.ts";
import type { Backend, BackendTarget } from "../types/backend.ts";
import type { AgentView } from "../types/store.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { OrchSettings } from "../types/settings.ts";
import { viewForKey, addressOf, indexPresenceById, normalizedAgentName } from "./lookup.ts";

/** The fleet as one read: every agent by id, the presence that names it, and
 *  what each reachable plexer says it still holds. */
interface Fleet {
  readonly views: ReadonlyMap<string, AgentView>;
  readonly presence: ReadonlyMap<string, PresenceEntry>;
  readonly presenceById: ReadonlyMap<string, PresenceEntry>;
  readonly census: Census;
}

/** What each environment answers it still holds, by handle. An environment that
 *  cannot answer is absent from this map, and its recorded handles stand. */
type Census = ReadonlyMap<string, ReadonlyMap<string, BackendTarget>>;

/** Ask every environment what it holds, ONCE per build. */
/** The plexers the settings enable. Every registered plexer used to be probed on
 *  every command, so a fleet of headless agents paid a retrying tmux and herdr
 *  listing (seconds each) that the settings had already ruled out. */
function enabledBackends(settings: OrchSettings): Backend[] {
  const enabled = new Set(settings.enabled.backends);
  return allBackends().filter((backend) => enabled.has(backend.id));
}

function paneCensus(settings: OrchSettings): Census {
  const census = new Map<string, ReadonlyMap<string, BackendTarget>>();
  for (const backend of enabledBackends(settings)) {
    if (!backend.placementInventory || !backend.isAvailable()) continue;
    try {
      census.set(backend.id, new Map(backend.placementInventory.list().map((target) => [String(target.handle), target])));
    } catch { /* an environment that cannot answer says nothing either way */ }
  }
  return census;
}

function handlesByKey(fleet: Fleet, backend: Backend): Map<string, string> {
  const keyByHandle = new Map<string, string>();
  for (const view of fleet.views.values()) {
    const { plexer, handle } = view.environment;
    if (plexer === backend.id && handle !== null) keyByHandle.set(handle, addressOf(view, fleet.presenceById));
  }
  return keyByHandle;
}

function entityFromBackendTarget(
  root: OrchDir,
  backend: Backend,
  target: BackendTarget,
  keyByHandle: Map<string, string>,
  fleet: Fleet,
  usedPresence: Set<string>,
): Entity {
  const paneId = String(target.handle);
  const key = keyByHandle.get(paneId) ?? paneId;
  const pres: PresenceEntry | null = fleet.presence.get(key) ?? null;
  const view = viewForKey(fleet.views, key);
  if (pres) usedPresence.add(pres.key);
  return {
    key,
    paneId,
    managed: view !== undefined,
    ended: view?.endedAt != null,
    // Orch's registry owns the name; the backend's own pane label is only a
    // fallback for panes orch never spawned.
    name: normalizedAgentName(root, key) ?? target.name,
    tabLabel: target.groupLabel,
    agent: target.agent,
    focused: target.focused,
    // Captured orch presence is authoritative; plexer-reported status is
    // inventory metadata only and never becomes agent truth.
    backendStatus: pres?.status?.state ?? null,
    backend: backend.id,
    presence: pres,
    // Bridge-first: the adapter's own presence status tracks the LIVE session
    // and follows a `/new` reset; the backend's agent_session is launch-time
    // and goes stale, which is what makes mid-run `tail` read an empty session.
    sessionPath: pres?.status?.sessionPath ?? null,
    presenceOnly: false,
    // ADR 0001: `target.workspace` is the PLEXER's own grouping — herdr's `wF`,
    // a tmux session. It is environment, never orch's space, and preferring it
    // here is exactly how `wF` got shown as a name the user had chosen. orch's
    // space is read from orch's own record or it is absent.
    space: spaceOf(root, key),
  };
}

function entitiesFromBackend(root: OrchDir, backend: Backend, fleet: Fleet, usedPresence: Set<string>): Entity[] {
  const listed = fleet.census.get(backend.id);
  if (listed === undefined) return [];
  const keyByHandle = handlesByKey(fleet, backend);
  return [...listed.values()]
    .map((target) => entityFromBackendTarget(root, backend, target, keyByHandle, fleet, usedPresence));
}

function presenceStatusFields(entry: PresenceEntry): Pick<Entity, "agent" | "sessionPath"> {
  const status = entry.status;
  return {
    agent: status?.agent ?? null,
    sessionPath: status?.sessionPath ?? null,
  };
}

function presenceOnlyEntity(root: OrchDir, entry: PresenceEntry, fleet: Fleet): Entity {
  const view = viewForKey(fleet.views, entry.key);
  const statusFields = presenceStatusFields(entry);
  // U1: a pane is environment, so orch's own record answers for it. The agent's
  // self-report reached `peek` as a handle no plexer had.
  const plexer = view?.environment.plexer ?? null;
  return {
    key: entry.key,
    ...statusFields,
    paneId: confirmedHandle(fleet.census, plexer, view?.environment.handle ?? null),
    managed: view !== undefined,
    ended: view?.endedAt != null,
    name: normalizedAgentName(root, entry.key) ?? null,
    tabLabel: null,
    focused: false,
    backendStatus: null,
    backend: plexer,
    presence: entry,
    presenceOnly: true,
    space: view?.environment.space ?? spaceOf(root, entry.key),
  };
}

function entitiesFromPresence(root: OrchDir, fleet: Fleet, usedPresence: Set<string>): Entity[] {
  return [...fleet.presence.values()]
    .filter((entry) => !usedPresence.has(entry.key))
    .map((entry) => presenceOnlyEntity(root, entry, fleet));
}

/** The handle the environment confirms it still has, else null. Only an
 *  environment that answered, and did not list the handle, takes it away.
 *  An agent with no handle keeps its id and its link (Rule 11). */
function confirmedHandle(census: Census, plexer: string | null, handle: string | null): string | null {
  if (handle === null) return null;
  const held = plexer === null ? undefined : census.get(plexer);
  return held === undefined || held.has(handle) ? handle : null;
}

/** Agents the store knows that neither a pane nor a presence directory surfaced.
 *  An agent with no handle is one with no SHORTCUT — it is still orch's, still
 *  addressable, and still listed. */
function entitiesFromStore(fleet: Fleet, entities: Entity[]): Entity[] {
  const listed = new Set(entities.map((entity) => entity.key));
  const found: Entity[] = [];
  for (const view of fleet.views.values()) {
    const key = addressOf(view, fleet.presenceById);
    if (listed.has(key)) continue;
    const { plexer, handle, space } = view.environment;
    found.push({
      key,
      paneId: confirmedHandle(fleet.census, plexer, handle),
      managed: true,
      ended: view.endedAt != null,
      name: view.name,
      tabLabel: null,
      agent: null,
      focused: false,
      backendStatus: null,
      backend: plexer,
      presence: null,
      sessionPath: null,
      presenceOnly: true,
      space,
    });
  }
  return found;
}

export function buildEntities(root: OrchDir, settings: OrchSettings, options: { skipBackends?: boolean } = {}): Entity[] {
  const presence = loadPresence(root);
  const fleet: Fleet = { views: agentViewIndex(root), presence, presenceById: indexPresenceById(presence), census: paneCensus(settings) };
  const usedPresence = new Set<string>();
  const backendEntities = options.skipBackends
    ? []
    : enabledBackends(settings).flatMap((backend) => entitiesFromBackend(root, backend, fleet, usedPresence));
  const entities = [...backendEntities, ...entitiesFromPresence(root, fleet, usedPresence)];
  return [...entities, ...entitiesFromStore(fleet, entities)];
}

function naturalPaneOrder(id: string): [string, number] {
  const match = /^(.*?):p?(\d+)$/.exec(id);
  return match ? [match[1]!, parseInt(match[2]!, 10)] : [id, 0];
}

export function sortEntities(entities: Entity[]): Entity[] {
  const live = entities.filter((entity) => !entity.presenceOnly);
  const only = entities.filter((entity) => entity.presenceOnly);
  live.sort((left, right) => {
    const [leftGroup, leftNumber] = naturalPaneOrder(left.paneId ?? left.key);
    const [rightGroup, rightNumber] = naturalPaneOrder(right.paneId ?? right.key);
    return leftGroup === rightGroup ? leftNumber - rightNumber : leftGroup < rightGroup ? -1 : 1;
  });
  only.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
  return [...live, ...only];
}
