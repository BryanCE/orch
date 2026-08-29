import { loadConfig, type HostConfig } from "../config.ts";
import { getBackend, resolveBackend } from "../backends/registry.ts";
import type { Backend, BackendHandle } from "../backends/backend.ts";
import { parseIdentity, tryParseIdentity } from "../backends/identity.ts";
import { buildEntities, parseTarget, resolveTarget, type Entity } from "../entities.ts";
import { selfId } from "../identity/self.ts";
import { spawnerIdentity } from "../policy/spawner.ts";
import { operatorControls } from "../policy/space.ts";
import { runSSH } from "../remote.ts";
import { loadPresence, orchDir, type PresenceEntry } from "../presence/store.ts";
import { agentViews, type AgentView } from "../store/agent-view.ts";
import { currentLease } from "../store/lease-rows.ts";
import { errorMessage, isRecord } from "../util.ts";
import { CommandRefusal } from "../refusal.ts";
import { commandLogger } from "./logging.ts";

export function die(msg: string): never {
  commandLogger().error("command.failed", { error: msg });
  throw new CommandRefusal(msg);
}

export function firstNonEmptyText(...values: (string | null | undefined)[]): string {
  return values.find((value) => Boolean(value)) ?? "";
}

export function resultText(value: unknown): string | undefined {
  return isRecord(value) && typeof value.text === "string" ? value.text : undefined;
}

export function splitOptionFlags(args: string[], names: readonly string[]): { enabled: Set<string>; positional: string[] } {
  const known = new Set(names);
  const enabled = new Set<string>();
  const positional: string[] = [];
  for (const argument of args) {
    if (known.has(argument)) enabled.add(argument);
    else positional.push(argument);
  }
  return { enabled, positional };
}

export function parseTargetPrompt(args: string[], ignoredFlag: string, usage: string): { target: string; prompt: string } {
  const positional = args.filter((argument) => argument !== ignoredFlag);
  const target = positional[0];
  const prompt = positional.slice(1).join(" ");
  if (!target || !prompt) die(usage);
  return { target, prompt };
}

export function requirePresenceTarget(target: string): Entity {
  const ent = resolveTarget(target);
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  return ent;
}

function looksLikePaneKey(key: string): boolean {
  return tryParseIdentity(key) !== null;
}

/**
 * The one identity inside a presence key.
 *
 * A key is `<plexer>~<space>~<id>`: environment wrapped around orch's minted id
 * (Rule 11). The store is keyed by the id alone, so every join from a key to an
 * agent goes through here — reading the whole key as an identity is what made a
 * moved agent look like a different one.
 */
export function agentIdOfKey(key: string | null | undefined): string | null {
  return tryParseIdentity(key)?.id ?? null;
}

/** Every agent the store knows, indexed by its minted id. */
export function agentViewIndex(root = orchDir()): Map<string, AgentView> {
  const index = new Map<string, AgentView>();
  for (const view of agentViews(root)) index.set(view.id, view);
  return index;
}

/** Presence re-indexed by minted id so an {@link AgentView} joins to it without
 *  ever reconstructing a key. Entries whose directory name carries no identity
 *  belong to no agent orch minted. */
export function presenceById(presence: ReadonlyMap<string, PresenceEntry> = loadPresence()): Map<string, PresenceEntry> {
  const byId = new Map<string, PresenceEntry>();
  for (const entry of presence.values()) {
    const id = agentIdOfKey(entry.key);
    if (id !== null) byId.set(id, entry);
  }
  return byId;
}

export function viewForKey(views: ReadonlyMap<string, AgentView>, key: string): AgentView | undefined {
  const id = agentIdOfKey(key);
  return id === null ? undefined : views.get(id);
}

/** The address that reaches an agent: the presence key it actually has, else
 *  its bare id. The key is READ from presence, never rebuilt from environment —
 *  an axis it happens to be missing must not silently rename it. */
export function agentAddress(view: AgentView, presence: ReadonlyMap<string, PresenceEntry>): string {
  return presence.get(view.id)?.key ?? view.id;
}

/** The live lease holder for one identity key, or null when nothing holds it. */
export function leaseHolderOf(key: string): string | null {
  const id = agentIdOfKey(key);
  if (id === null) return null;
  try {
    return currentLease(orchDir(), id)?.orchId ?? null;
  } catch {
    return null;
  }
}

export function livePanePresenceEntries(): PresenceEntry[] {
  return [...loadPresence().values()].filter((pres) => pres.alive && looksLikePaneKey(pres.key));
}

export function targetHost(target: string): { host: string; target: string } | null {
  try {
    const ref = parseTarget(target, loadConfig(orchDir()).hosts);
    return ref.host ? { host: ref.host, target: ref.target } : null;
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

export function remoteCommandArgs(host: HostConfig, command: string, args: readonly string[]): string {
  const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
  const prefix = host.orch_dir ? `env ORCH_DIR=${quote(host.orch_dir)} ` : "";
  return `${prefix}orch ${[command, ...args].map(quote).join(" ")}`;
}

export function remoteWrite(hostName: string, command: string, args: readonly string[]): void {
  const host = loadConfig(orchDir()).hosts[hostName];
  const destination = host?.dest;
  if (!host || !destination) die(`Host "${hostName}" has no SSH destination.`);
  const result = runSSH(destination, remoteCommandArgs(host, command, args), { timeoutMs: host.timeout_ms });
  if (!result.ok) die(`Host "${hostName}" is unreachable: ${result.stderr.trim() || "ssh failed"}`);
  if (result.stdout) process.stdout.write(result.stdout.endsWith("\n") ? result.stdout : result.stdout + "\n");
}

export function callerOwnerToken(): string | undefined {
  // The stamped owner is the id orch issued this process - the same id its
  // leases are held by. Never a plexer coordinate: that names an environment,
  // matches no stored record, and made orch refuse the fleet it had just spawned.
  const explicit = process.env.ORCH_OWNER;
  if (explicit) return explicit;
  return selfId();
}

/** Refuse bulk operations that cannot identify their calling orchestrator. */
export function requireCallerOwnerToken(): string {
  const token = callerOwnerToken();
  if (!token) die("Bulk operation refused: set ORCH_OWNER to identify this orchestrator.");
  return token;
}

/** True when this process was launched as an orch-spawned agent. */
export function callerIsSpawnedAgent(): boolean {
  return tryParseIdentity(process.env.ORCH_AGENT_KEY) !== null;
}

/** Owner-gate overrides are operator-only. A spawned agent may touch exactly
 *  what it spawned — no flag widens that, ever. */
export function forbidAgentOverride(flag: string): void {
  if (callerIsSpawnedAgent()) die(`${flag} is operator-only: a spawned agent may only touch agents it spawned.`);
}

/** Where the caller acts: the pane it is sitting in, else the space its own
 *  owner token names. An operator driving orch from outside any pane still
 *  operates a space, and losing that made its own fleet foreign to it. */
export function actorSpace(token: string): string | null {
  return callerSpace() ?? tryParseIdentity(token)?.workspace ?? null;
}

export function ownsAgent(record: { owner?: string; pane?: string }): boolean {
  const token = callerOwnerToken();
  if (!token) return false;
  if (record.owner === token) return true;
  return !callerIsSpawnedAgent()
    && operatorControls(orchDir(), token, record.pane ?? null, actorSpace(token), true);
}

/** Return the exact session address that spawned this caller. */
export function selfSpawnAddress(): string | undefined {
  return spawnerIdentity().key ?? undefined;
}

/** True when a record predates spawn-session stamping or belongs to this session. */
export function spawnedBySelf(record: { spawnedBy?: string }): boolean {
  return record.spawnedBy === undefined || record.spawnedBy === selfSpawnAddress();
}

export function assertAgentOwned(
  target: string,
  entity: Pick<Entity, "key">,
  force = false,
  views?: ReadonlyMap<string, AgentView>,
): void {
  if (force) {
    forbidAgentOverride("--force");
    return;
  }
  // Ownership is the open lease and nothing else. A closed one is history, and
  // history never gates a write (Rule 11).
  const holder = views ? viewForKey(views, entity.key)?.heldBy?.orchId ?? null : leaseHolderOf(entity.key);
  if (holder !== null && !ownsAgent({ owner: holder, pane: entity.key })) {
    die(`Target "${target}" is owned by ${holder}. Use --force to override.`);
  }
}

export function callerSpace(): string | null {
  const backend = resolveBackend({ configured: loadConfig(orchDir()).defaults.backend ?? null });
  return backend.identity?.current()?.workspace ?? null;
}

export function backendTarget(
  target: string,
  command: string,
  views?: ReadonlyMap<string, AgentView>,
): { backend: Backend; handle: string; key: string } {
  const ent = resolveTarget(target);
  const id = parseIdentity(ent.key);
  const backend = getBackend(id.backend);
  if (!backend) die(`orch ${command}: backend ${JSON.stringify(id.backend)} is not registered.`);
  // Resolve the user-facing target once, then pass the backend's real pane
  // handle. Names are display metadata; herdr pane commands require paneId.
  // A headless target has no pane handle; retain its identity so the command
  // boundary can return a successful no-pane answer without touching a provider.
  const handle = ent.paneId ?? viewForKey(views ?? agentViewIndex(), ent.key)?.environment.handle ?? ent.key;
  return { backend, handle, key: ent.key };
}

export interface LifecycleTarget {
  readonly entity: Entity;
  /** The address orch reaches this agent by: its presence key, else its id. */
  readonly key: string;
  /** The composed agent, or null for a pane orch never minted an id for. */
  readonly view: AgentView | null;
  readonly backend: Backend;
  /** Backend-native handle, or a headless pid/key signal handle. */
  readonly handle: BackendHandle;
}

/** Every spelling that addresses one agent: its minted id, its mutable name, or
 *  its current pane handle. Only the id is identity; the other two are lookups,
 *  and the handle is environment — it changes when the agent moves. */
export function agentTargetMatches(view: AgentView, target: string): boolean {
  return view.id === target || view.name === target || view.environment.handle === target;
}

export function resolveAgentView(
  views: readonly AgentView[],
  presence: ReadonlyMap<string, PresenceEntry>,
  target: string,
): AgentView | undefined {
  const candidates = views.filter((view) => agentTargetMatches(view, target)
    || agentAddress(view, presence) === target);
  const live = candidates.filter((view) => presence.get(view.id)?.alive === true);
  const preferred = live.length > 0 ? live : candidates;
  if (preferred.length > 1) {
    const ids = preferred.map((view) => view.id).join(", ");
    throw new Error(`Ambiguous target "${target}"; address by id: ${ids}`);
  }
  return preferred[0];
}

/**
 * Resolve lifecycle targets from orch's registry, not the current space.
 * Close is cleanup, so it must still resolve a dead or headless record after
 * the backend has stopped reporting the pane.
 */
export function resolveLifecycleTarget(target: string): LifecycleTarget {
  const views = agentViewIndex();
  const presence = presenceById();
  const entities = buildEntities();
  // Prefer the live backend inventory. A registry row can retain an old pane
  // key after a store wipe; its handle/name must not become a malformed identity.
  const direct = entities.filter((entity) => entity.key === target || entity.paneId === target || entity.name === target);
  const liveDirect = direct.filter((entity) => entity.presence?.alive === true);
  const directMatches = liveDirect.length > 0 ? liveDirect : direct;
  if (directMatches.length > 1) {
    const keys = directMatches.map((entity) => entity.key).join(", ");
    die(`Ambiguous target "${target}"; address by key: ${keys}`);
  }
  let ent = directMatches[0];
  let record = ent ? currentRecords.get(ent.key) : undefined;
  // A stale registry handle can make buildEntities temporarily expose the pane
  // id as its key. Prefer the bridge's canonical presence identity when one is
  // available for that pane, rather than carrying the malformed key onward.
  const stalePaneId = ent?.paneId;
  if (ent && !tryParseIdentity(ent.key) && stalePaneId) {
    const canonical = entities.find((candidate) => tryParseIdentity(candidate.key)
      && candidate.presence?.status?.paneId === stalePaneId);
    if (canonical) {
      record = record ?? [...currentRecords.values()].find((row) => row.handle === stalePaneId || row.name === target);
      ent = canonical;
    }
  }
  if (!ent) {
    try {
      record = resolveRegistryRecord([...currentRecords.values()], loadPresence(), target);
    } catch (error: unknown) {
      die(errorMessage(error));
    }
    if (record) {
      const linked = entities.filter((candidate) => candidate.key === record!.pane
        || (!!record!.handle && candidate.paneId === record!.handle)
        || (!!record!.name && candidate.name === record!.name));
      if (linked.length === 1) ent = linked[0];
    }
  }
  if (!ent && !record) ent = resolveTarget(target, { all: true });
  // A stale row addressed by name may still have no inventory entry; retain
  // its metadata and let the backend-native handle perform cleanup.
  ent ??= { key: record!.pane, paneId: record!.handle ?? null, managed: true, name: record!.name ?? null,
    tabLabel: null, agent: record!.adapter ?? null, focused: false, backendStatus: null,
    backend: record!.backend ?? null, presence: loadPresence().get(record!.pane) ?? null,
    sessionPath: null, presenceOnly: true, space: record!.space ?? null };
  record = record ?? currentRecords.get(ent.key);
  const parsed = tryParseIdentity(ent.key) ?? (record ? tryParseIdentity(record.pane) : null);
  const backendId = record?.backend ?? ent.backend ?? parsed?.backend;
  const backend = backendId ? getBackend(backendId) : undefined;
  if (!backend) die(`Target "${target}" uses unknown backend ${JSON.stringify(backendId)}.`);
  const effectiveRecord = record ?? { pane: ent.key, backend: backend.id, handle: ent.paneId ?? parsed?.id };
  const pid = ent.presence?.status?.pid;
  const handle = effectiveRecord.handle ?? ent.paneId ?? (typeof pid === "number" ? { pid, key: ent.key } : (parsed?.id ?? ent.key));
  return { entity: ent, record: effectiveRecord, backend, handle };
}
