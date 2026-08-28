import { loadConfig, type HostConfig } from "./config.ts";
import { allBackends, resolveBackend } from "./backends/registry.ts";
import type { Backend, BackendTarget } from "./backends/backend.ts";
import { loadPresence, orchDir, spawnedRecords, type PresenceEntry } from "./presence/store.ts";
import { serializeIdentity, tryParseIdentity } from "./backends/identity.ts";
import { checkWall, sameWorkspace, workspaceOf } from "./policy/workspace.ts";
import { errorMessage } from "./util.ts";
import { abstractAgentLabel } from "./notify/format.ts";
import type { Recipient } from "./recipient.ts";
import type { SpawnedRecord } from "./store/spawned-rows.ts";

export { workspaceOf } from "./policy/workspace.ts";
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
  /** Workspace from the backend view or orch's spawned registry. */
  workspace: string | null;
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
function recipientName(record: SpawnedRecord | undefined, status: PresenceEntry["status"], workspace: string, key: string): string {
  return record?.name ?? status?.label ?? status?.agent ?? abstractAgentLabel(workspace, key);
}

function recipientHarness(record: SpawnedRecord | undefined, status: PresenceEntry["status"]): string | null {
  return record?.adapter ?? status?.agent ?? null;
}

export function recipientFor(key: string, spawned = spawnedRecords()): Recipient {
  const record = spawned.get(key);
  const status = loadPresence().get(key)?.status;
  const workspace = record?.workspace ?? workspaceOf(orchDir(), key) ?? "workspace";
  return {
    name: recipientName(record, status, workspace, key),
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

export function entityWorkspace(e: Entity): string | null {
  return e.workspace ?? workspaceOf(orchDir(), e.key);
}

export function currentWorkspace(): string | null {
  return resolveBackend({}).currentIdentity?.()?.workspace ?? null;
}

/** The orchestrator's own target key, used for ownership and wall checks. */
export function selfActor(): string | null {
  // A spawned agent acts as ITSELF — the key minted at its launch — never as
  // the shared workspace operator. One shared token was how a single agent's
  // `close --all` owned, and killed, every fleet in the workspace.
  const spawnedIdentity = tryParseIdentity(process.env.ORCH_AGENT_KEY);
  if (spawnedIdentity) return serializeIdentity(spawnedIdentity);
  const id = resolveBackend({}).currentIdentity?.();
  return id ? serializeIdentity({ backend: id.backend, workspace: id.workspace, id: "operator" }) : null;
}

export function scopeEntitiesToWorkspace(entities: Entity[], opts?: { all?: boolean }): Entity[] {
  const currentWs = currentWorkspace();
  if (opts?.all === true || currentWs === null) return entities;
  return entities.filter((entity) => sameWorkspace(entityWorkspace(entity), currentWs));
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
    name: records.get(key)?.name ?? target.name,
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
    workspace: target.workspace ?? workspaceOf(orchDir(), key),
  };
}

function entitiesFromBackend(
  backend: Backend,
  presence: Map<string, PresenceEntry>,
  records: Map<string, SpawnedRecord>,
  usedPresence: Set<string>,
): Entity[] {
  if ((!backend.paneInventory && !backend.inventory) || !backend.isInsideSession()) return [];
  const keyByHandle = handlesByKey(records, backend);
  return (backend.paneInventory?.list() ?? backend.inventory?.() ?? [])
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
    name: record?.name ?? null,
    tabLabel: null,
    focused: false,
    backendStatus: null,
    backend: record?.backend ?? null,
    presence: entry,
    presenceOnly: true,
    workspace: record?.workspace ?? workspaceOf(orchDir(), entry.key),
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
        name: record.name ?? null,
        tabLabel: null,
        agent: null,
        focused: false,
        backendStatus: null,
        backend: record.backend ?? null,
        presence: null,
        sessionPath: null,
        presenceOnly: true,
        workspace: record.workspace ?? null,
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
    const [leftWorkspace, leftNumber] = naturalPaneOrder(left.paneId ?? left.key);
    const [rightWorkspace, rightNumber] = naturalPaneOrder(right.paneId ?? right.key);
    return leftWorkspace === rightWorkspace ? leftNumber - rightNumber : leftWorkspace < rightWorkspace ? -1 : 1;
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

// Every control/read target resolves within the caller's own workspace by
// default — crossing the wall is never an accident of typing a foreign key.
// A host-prefixed (<host>/<target>) or --all target opts out; headless runs
// (no current workspace) are unscoped.
export function resolveTarget(target: string, opts?: { all?: boolean; crossWorkspace?: boolean }): Entity {
  let ref: TargetRef;
  try {
    ref = parseTarget(target);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const localTarget = ref.target;
  const everything = buildEntities();
  const crossWorkspace = opts?.crossWorkspace === true;
  const crossWall = opts?.all === true || crossWorkspace || ref.host !== null;
  const pool = scopeEntitiesToWorkspace(everything, { all: crossWall });

  const match = matchInPool(pool, localTarget, target, ref.host);
  if (match) return match;

  if (!crossWall) {
    const foreign = matchInPool(everything, localTarget, target);
    if (foreign) {
      // The wall decision lives in policy/workspace.ts alone; this only relays it.
      const decision = checkWall(orchDir(), selfActor(), foreign.key, { crossWorkspace: false });
      if (!decision.allowed) die(decision.reason ?? "workspace-wall denied the write");
    }
  }
  die(`No target matches "${target}". Run 'orch panes' to list.`);
}

export function resolvePane(target: string, opts?: { all?: boolean; crossWorkspace?: boolean }): { ent: Entity; pane: string } {
  const ent = resolveTarget(target, opts);
  if (!ent.paneId) die(`Target "${target}" has no pane.`);
  return { ent, pane: ent.paneId };
}
