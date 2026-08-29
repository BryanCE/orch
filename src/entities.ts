import { loadConfig, type HostConfig } from "./config.ts";
import { allBackends, resolveBackend } from "./backends/registry.ts";
import { loadPresence, orchDir } from "./presence/store.ts";
import { tryParseIdentity } from "./backends/identity.ts";
import { agentById } from "./store/agent-rows.ts";
import { checkWall, sameSpace, spaceOf } from "./policy/space.ts";
import { errorMessage } from "./util.ts";
import { abstractAgentLabel } from "./notify/format.ts";
import type { Recipient } from "./recipient.ts";
import { agentView, agentViews } from "./store/agent-view.ts";
import { selfId } from "./identity/self.ts";
import { CommandRefusal } from "./refusal.ts";

export { spaceOf } from "./policy/space.ts";
export { recipientLabel, type Recipient } from "./recipient.ts";
import type { Backend, BackendTarget } from "./types/backend.ts";
import type { AgentView } from "./types/store.ts";
import type { PresenceEntry } from "./types/presence.ts";

export interface Entity {
  key: string;
  paneId: string | null;
  /** True when orch spawned this agent. A backend reports every pane it owns,
   *  including the orchestrator's own — false means "someone else's pane". */
  managed: boolean;
  name: string | null;
  tabLabel: string | null;
  agent: string | null;
  focused: boolean;
  backendStatus: string | null;
  /** Backend that owns this agent; what its capabilities are read from. */
  backend: string | null;
  presence: PresenceEntry | null;
  sessionPath: string | null;
  presenceOnly: boolean;
  /** Space from the backend view or orch's spawned registry. */
  space: string | null;
  /** Set when this entity was addressed with a configured host prefix. */
  host?: string;
}

interface TargetRef {
  host: string | null;
  target: string;
}

/** Split `<host>/<target>` without changing the meaning of targets without `/`. */
export function parseTarget(target: string, hosts?: Record<string, HostConfig>): TargetRef {
  const slash = target.indexOf("/");
  if (slash < 0) return { host: null, target };
  const host = target.slice(0, slash);
  const remainder = target.slice(slash + 1);
  const configured = hosts ?? loadConfig(orchDir()).hosts;
  if (!host || !remainder) throw new Error(`Invalid target "${target}". Expected <host>/<target>.`);
  if (!Object.prototype.hasOwnProperty.call(configured, host)) {
    const names = Object.keys(configured).sort();
    throw new Error(`Unknown host "${host}". Configured hosts: ${names.length ? names.join(", ") : "none"}`);
  }
  return { host, target: remainder };
}

export function formatTarget(ref: TargetRef): string {
  return ref.host ? `${ref.host}/${ref.target}` : ref.target;
}

/** Every agent the store knows, indexed by its minted id — the ONLY key the
 *  store has. A store that does not exist yet is an empty fleet, not a crash. */
function viewsById(root = orchDir()): Map<string, AgentView> {
  const index = new Map<string, AgentView>();
  try {
    for (const view of agentViews(root)) index.set(view.id, view);
  } catch { /* nothing spawned yet */ }
  return index;
}

/** Join a presence/pane key to its agent through the minted id alone. Reading
 *  the whole key as an identity is what made a MOVED agent look like a new one. */
function viewForKey(views: ReadonlyMap<string, AgentView>, key: string): AgentView | undefined {
  const id = tryParseIdentity(key)?.id;
  return id === undefined ? undefined : views.get(id);
}

/** The address that reaches an agent: the presence key it actually has, else
 *  its bare id. Never rebuilt from environment — an axis it happens to be
 *  missing must not silently rename it. */
function addressOf(view: AgentView, presenceById: ReadonlyMap<string, PresenceEntry>): string {
  return presenceById.get(view.id)?.key ?? view.id;
}

function indexPresenceById(presence: ReadonlyMap<string, PresenceEntry>): Map<string, PresenceEntry> {
  const byId = new Map<string, PresenceEntry>();
  for (const entry of presence.values()) {
    const id = tryParseIdentity(entry.key)?.id;
    if (id !== undefined) byId.set(id, entry);
  }
  return byId;
}

/** Resolve an identity key to the agent an operator knows. */
function normalizedAgentName(key: string): string | null {
  const id = tryParseIdentity(key)?.id;
  if (!id) return null;
  try { return agentById(orchDir(), id)?.name ?? null; } catch { return null; }
}

function recipientName(status: PresenceEntry["status"], space: string, key: string): string {
  return normalizedAgentName(key) ?? status?.label ?? status?.agent ?? abstractAgentLabel(space, key);
}

export function recipientFor(key: string, views = viewsById()): Recipient {
  const view = viewForKey(views, key);
  const status = loadPresence().get(key)?.status ?? null;
  const space = view?.environment.space ?? spaceOf(orchDir(), key) ?? "space";
  return {
    name: recipientName(status, space, key),
    // The harness is the agent's own, never the plexer it happens to sit in.
    harness: view?.harnessId ?? status?.agent ?? null,
    multiplexer: view?.environment.plexer ?? null,
    // A missing handle is a missing shortcut, not an unreachable agent: orch's
    // own inbox/ack channel is addressed by the key either way.
    transportId: view?.environment.handle ?? key,
  };
}

export function collapse(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function naturalPaneOrder(id: string): [string, number] {
  const match = /^(.*?):p?(\d+)$/.exec(id);
  return match ? [match[1]!, parseInt(match[2]!, 10)] : [id, 0];
}

export function entitySpace(e: Entity): string | null {
  return e.space ?? spaceOf(orchDir(), e.key);
}

export function currentSpace(): string | null {
  // Where the calling process sits is ENVIRONMENT, read from the agent it IS —
  // never a field on its identity, which is the minted id and nothing else.
  // `null` is a real answer: a caller in no space is unscoped, and inventing a
  // place for it is exactly what produced the fictional "local".
  const id = resolveBackend({}).identity?.current()?.id;
  if (id === undefined) return null;
  try {
    return agentView(orchDir(), id)?.environment.space ?? null;
  } catch {
    return null;
  }
}

export function scopeEntitiesToSpace(entities: Entity[], opts?: { all?: boolean }): Entity[] {
  const current = currentSpace();
  if (opts?.all === true || current === null) return entities;
  return entities.filter((entity) => sameSpace(entitySpace(entity), current));
}

/** The fleet as one read: every agent by id, and the presence that names it. */
interface Fleet {
  readonly views: ReadonlyMap<string, AgentView>;
  readonly presence: ReadonlyMap<string, PresenceEntry>;
  readonly presenceById: ReadonlyMap<string, PresenceEntry>;
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
  backend: Backend,
  target: BackendTarget,
  keyByHandle: Map<string, string>,
  fleet: Fleet,
  usedPresence: Set<string>,
): Entity {
  const paneId = String(target.handle);
  const key = keyByHandle.get(paneId) ?? paneId;
  const pres: PresenceEntry | null = fleet.presence.get(key) ?? null;
  if (pres) usedPresence.add(pres.key);
  return {
    key,
    paneId,
    managed: viewForKey(fleet.views, key) !== undefined,
    // Orch's registry owns the name; the backend's own pane label is only a
    // fallback for panes orch never spawned.
    name: normalizedAgentName(key) ?? target.name,
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
    space: spaceOf(orchDir(), key),
  };
}

function entitiesFromBackend(backend: Backend, fleet: Fleet, usedPresence: Set<string>): Entity[] {
  if (!backend.paneInventory || !backend.isInsideSession()) return [];
  const keyByHandle = handlesByKey(fleet, backend);
  return backend.paneInventory.list()
    .map((target) => entityFromBackendTarget(backend, target, keyByHandle, fleet, usedPresence));
}

function presenceStatusFields(entry: PresenceEntry): Pick<Entity, "paneId" | "agent" | "sessionPath"> {
  const status = entry.status;
  return {
    paneId: status?.paneId ?? null,
    agent: status?.agent ?? null,
    sessionPath: status?.sessionPath ?? null,
  };
}

function presenceOnlyEntity(entry: PresenceEntry, fleet: Fleet): Entity {
  const view = viewForKey(fleet.views, entry.key);
  const statusFields = presenceStatusFields(entry);
  return {
    key: entry.key,
    ...statusFields,
    managed: view !== undefined,
    name: normalizedAgentName(entry.key) ?? null,
    tabLabel: null,
    focused: false,
    backendStatus: null,
    backend: view?.environment.plexer ?? null,
    presence: entry,
    presenceOnly: true,
    space: view?.environment.space ?? spaceOf(orchDir(), entry.key),
  };
}

function entitiesFromPresence(fleet: Fleet, usedPresence: Set<string>): Entity[] {
  return [...fleet.presence.values()]
    .filter((entry) => !usedPresence.has(entry.key))
    .map((entry) => presenceOnlyEntity(entry, fleet));
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
    const backend = plexer === null ? undefined : allBackends().find((candidate) => candidate.id === plexer);
    found.push({
      key,
      paneId: backend?.paneInventory ? handle : null,
      managed: true,
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

export function buildEntities(options: { skipBackends?: boolean } = {}): Entity[] {
  const presence = loadPresence();
  const fleet: Fleet = { views: viewsById(), presence, presenceById: indexPresenceById(presence) };
  const usedPresence = new Set<string>();
  const backendEntities = options.skipBackends
    ? []
    : allBackends().flatMap((backend) => entitiesFromBackend(backend, fleet, usedPresence));
  const entities = [...backendEntities, ...entitiesFromPresence(fleet, usedPresence)];
  return [...entities, ...entitiesFromStore(fleet, entities)];
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

function die(message: string): never {
  throw new CommandRefusal(message);
}

function dedupeEntities(entities: Entity[]): Entity[] {
  const seen = new Set<string>();
  return entities.filter((entity) => !seen.has(entity.key) && !!seen.add(entity.key));
}

function ambiguous(target: string, entities: Entity[]): never {
  const candidates = entities
    .map((entity) => `  ${entity.key}${entity.tabLabel ? `  (${entity.tabLabel})` : ""}${entity.agent ? `  ${entity.agent}` : ""}`)
    .join("\n");
  throw new CommandRefusal(`Ambiguous target "${target}". Candidates:\n${candidates}`);
}

function matchInPool(entities: Entity[], localTarget: string, target: string, host?: string | null): Entity | null {
  const withHost = (entity: Entity): Entity => (host ? { ...entity, host } : entity);

  const exact = dedupeEntities(entities.filter((entity) => entity.key === localTarget || entity.paneId === localTarget || entity.name === localTarget));
  if (exact.length === 1) return withHost(exact[0]!);
  if (exact.length > 1) ambiguous(target, exact);

  const suffix = dedupeEntities(entities.filter((entity) => [entity.key, entity.paneId].filter(Boolean).some((id) => {
    const value = id!;
    const short = value.slice(value.lastIndexOf(":") + 1);
    return value === localTarget || value.endsWith(":" + localTarget) || short.startsWith(localTarget) || value.endsWith(localTarget);
  })));
  if (suffix.length === 1) return withHost(suffix[0]!);
  if (suffix.length > 1) ambiguous(target, suffix);

  const byAgent = dedupeEntities(entities.filter((entity) => entity.agent === localTarget));
  if (byAgent.length === 1) return withHost(byAgent[0]!);
  if (byAgent.length > 1) ambiguous(target, byAgent);
  return null;
}

// Every control/read target resolves within the caller's own space by
// default — crossing the wall is never an accident of typing a foreign key.
// A host-prefixed (<host>/<target>) or --all target opts out; headless runs
// (no current space) are unscoped.
export function resolveTarget(target: string, opts?: { all?: boolean; crossSpace?: boolean }): Entity {
  let ref: TargetRef;
  try {
    ref = parseTarget(target);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const localTarget = ref.target;
  const everything = buildEntities();
  const crossSpace = opts?.crossSpace === true;
  const crossWall = opts?.all === true || crossSpace || ref.host !== null;
  const pool = scopeEntitiesToSpace(everything, { all: crossWall });

  const match = matchInPool(pool, localTarget, target, ref.host);
  if (match) return match;

  if (!crossWall) {
    const foreign = matchInPool(everything, localTarget, target);
    if (foreign) {
      // The wall decision lives in policy/space.ts alone; this only relays it.
      const decision = checkWall(orchDir(), selfId() ?? null, foreign.key, { crossSpace: false });
      if (!decision.allowed) die(decision.reason ?? "space-wall denied the write");
    }
  }
  die(`No target matches "${target}". Run 'orch panes' to list.`);
}

export function resolvePane(target: string, opts?: { all?: boolean; crossSpace?: boolean }): { ent: Entity; pane: string } {
  const ent = resolveTarget(target, opts);
  if (!ent.paneId) die(`Target "${target}" has no pane.`);
  return { ent, pane: ent.paneId };
}
