import { loadConfig, type HostConfig } from "./config.ts";
import { allBackends, resolveBackend } from "./backends/registry.ts";
import type { Backend, BackendTarget } from "./backends/backend.ts";
import { loadPresence, orchDir, spawnedRecords, type PresenceEntry } from "./presence/store.ts";
import { tryParseIdentity } from "./backends/identity.ts";
import { agentById } from "./store/agent-rows.ts";
import { checkWall, sameSpace, spaceOf } from "./policy/space.ts";
import { errorMessage } from "./util.ts";
import { abstractAgentLabel } from "./notify/format.ts";
import type { Recipient } from "./recipient.ts";
import type { SpawnedRecord } from "./store/spawned-rows.ts";
import { selfId } from "./identity/self.ts";

export { spaceOf } from "./policy/space.ts";
export { recipientLabel, type Recipient } from "./recipient.ts";

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

/** Resolve an identity key to the agent an operator knows, enriched with the routing
 *  facts only orch's spawn registry holds. */
function normalizedAgentName(key: string): string | null {
  const id = tryParseIdentity(key)?.id;
  if (!id) return null;
  try { return agentById(orchDir(), id)?.name ?? null; } catch { return null; }
}

function recipientName(_record: SpawnedRecord | undefined, status: PresenceEntry["status"], space: string, key: string): string {
  return normalizedAgentName(key) ?? status?.label ?? status?.agent ?? abstractAgentLabel(space, key);
}

function recipientHarness(record: SpawnedRecord | undefined, status: PresenceEntry["status"]): string | null {
  return record?.adapter ?? status?.agent ?? null;
}

export function recipientFor(key: string, spawned = spawnedRecords()): Recipient {
  const record = spawned.get(key);
  const status = loadPresence().get(key)?.status ?? null;
  const space = record?.space ?? spaceOf(orchDir(), key) ?? "space";
  return {
    name: recipientName(record, status, space, key),
    harness: recipientHarness(record, status),
    multiplexer: record?.backend ?? null,
    transportId: record?.handle ?? key,
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
  // The plexer's own grouping is what orch has stood a space up on so far; the
  // word stays on the port's side of the boundary and never crosses it.
  return resolveBackend({}).identity?.current()?.workspace ?? null;
}

export function scopeEntitiesToSpace(entities: Entity[], opts?: { all?: boolean }): Entity[] {
  const current = currentSpace();
  if (opts?.all === true || current === null) return entities;
  return entities.filter((entity) => sameSpace(entitySpace(entity), current));
}

function handlesByKey(records: Map<string, SpawnedRecord>, backend: Backend): Map<string, string> {
  const keyByHandle = new Map<string, string>();
  for (const [key, record] of records) {
    if (record.backend === backend.id && record.handle) keyByHandle.set(record.handle, key);
  }
  return keyByHandle;
}

function entityFromBackendTarget(
  backend: Backend,
  target: BackendTarget,
  keyByHandle: Map<string, string>,
  presence: Map<string, PresenceEntry>,
  records: Map<string, SpawnedRecord>,
  usedPresence: Set<string>,
): Entity {
  const paneId = String(target.handle);
  const key = keyByHandle.get(paneId) ?? paneId;
  const pres: PresenceEntry | null = presence.get(key) ?? null;
  if (pres) usedPresence.add(pres.key);
  return {
    key,
    paneId,
    managed: records.has(key),
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
    space: target.workspace ?? spaceOf(orchDir(), key),
  };
}

function entitiesFromBackend(
  backend: Backend,
  presence: Map<string, PresenceEntry>,
  records: Map<string, SpawnedRecord>,
  usedPresence: Set<string>,
): Entity[] {
  if (!backend.paneInventory || !backend.isInsideSession()) return [];
  const keyByHandle = handlesByKey(records, backend);
  return backend.paneInventory.list()
    .map((target) => entityFromBackendTarget(backend, target, keyByHandle, presence, records, usedPresence));
}

function presenceStatusFields(entry: PresenceEntry): Pick<Entity, "paneId" | "agent" | "sessionPath"> {
  const status = entry.status;
  return {
    paneId: status?.paneId ?? null,
    agent: status?.agent ?? null,
    sessionPath: status?.sessionPath ?? null,
  };
}

function presenceOnlyEntity(
  entry: PresenceEntry,
  records: Map<string, SpawnedRecord>,
): Entity {
  const record = records.get(entry.key);
  const statusFields = presenceStatusFields(entry);
  return {
    key: entry.key,
    ...statusFields,
    managed: records.has(entry.key),
    name: normalizedAgentName(entry.key) ?? null,
    tabLabel: null,
    focused: false,
    backendStatus: null,
    backend: record?.backend ?? null,
    presence: entry,
    presenceOnly: true,
    space: record?.space ?? spaceOf(orchDir(), entry.key),
  };
}

function entitiesFromPresence(
  presence: Map<string, PresenceEntry>,
  records: Map<string, SpawnedRecord>,
  usedPresence: Set<string>,
): Entity[] {
  return [...presence.values()]
    .filter((entry) => !usedPresence.has(entry.key))
    .map((entry) => presenceOnlyEntity(entry, records));
}

function entitiesFromRecords(
  records: Map<string, SpawnedRecord>,
  entities: Entity[],
): Entity[] {
  return [...records.entries()]
    .filter(([key]) => !entities.some((entity) => entity.key === key))
    .map(([key, record]) => {
      const backend = record.backend ? allBackends().find((candidate) => candidate.id === record.backend) : undefined;
      return {
        key,
        paneId: backend?.paneInventory ? record.handle ?? null : null,
        managed: true,
        name: normalizedAgentName(key) ?? null,
        tabLabel: null,
        agent: null,
        focused: false,
        backendStatus: null,
        backend: record.backend ?? null,
        presence: null,
        sessionPath: null,
        presenceOnly: true,
        space: record.space ?? null,
      };
    });
}

export function buildEntities(options: { skipBackends?: boolean } = {}): Entity[] {
  const presence = loadPresence();
  const records = spawnedRecords();
  const usedPresence = new Set<string>();
  const backendEntities = options.skipBackends
    ? []
    : allBackends().flatMap((backend) => entitiesFromBackend(backend, presence, records, usedPresence));
  const entities = [...backendEntities, ...entitiesFromPresence(presence, records, usedPresence)];
  return [...entities, ...entitiesFromRecords(records, entities)];
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
  process.stderr.write(message + "\n");
  process.exit(1);
}

function dedupeEntities(entities: Entity[]): Entity[] {
  const seen = new Set<string>();
  return entities.filter((entity) => !seen.has(entity.key) && !!seen.add(entity.key));
}

function ambiguous(target: string, entities: Entity[]): never {
  process.stderr.write(`Ambiguous target "${target}". Candidates:\n`);
  for (const entity of entities) process.stderr.write(`  ${entity.key}${entity.tabLabel ? `  (${entity.tabLabel})` : ""}${entity.agent ? `  ${entity.agent}` : ""}\n`);
  process.exit(1);
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
