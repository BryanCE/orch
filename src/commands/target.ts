import { loadConfig, type HostConfig } from "../config.ts";
import { getBackend, resolveBackend } from "../backends/registry.ts";
import type { Backend, BackendHandle } from "../backends/backend.ts";
import { parseIdentity, tryParseIdentity } from "../backends/identity.ts";
import { buildEntities, parseTarget, resolveTarget, selfActor, type Entity } from "../entities.ts";
import { runSSH } from "../remote.ts";
import { loadPresence, orchDir, spawnedRecords, type PresenceEntry } from "../presence/store.ts";
import type { SpawnedRecord } from "../store/sqlite.ts";
import { errorMessage, isRecord } from "../util.ts";

export function die(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(1);
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
  // The stamped owner MUST equal the write actor (selfActor), or an orchestrator
  // cannot steer/answer/reset the agents it spawned. Never the raw backend pane
  // id: that is unscoped and never string-matches the serialized actor.
  const explicit = process.env.ORCH_OWNER;
  if (explicit) return explicit;
  return selfActor() ?? undefined;
}

/** Refuse bulk operations that cannot identify their calling orchestrator. */
export function requireCallerOwnerToken(): string {
  const token = callerOwnerToken();
  if (!token) die("Bulk operation refused: set ORCH_OWNER to identify this orchestrator.");
  return token;
}

export function ownsAgent(record: { owner?: string }): boolean {
  const token = callerOwnerToken();
  return Boolean(token && record.owner === token);
}

export function assertAgentOwned(target: string, entity: Pick<Entity, "key">, force = false): void {
  if (force) return;
  const record = spawnedRecords().get(entity.key);
  if (record?.owner && !ownsAgent(record)) {
    die(`Target "${target}" is owned by ${record.owner}. Use --force to override.`);
  }
}

/** Check a registry-addressable target before resolving its live pane. */
export function assertRegisteredTargetOwned(target: string, force = false): void {
  if (force) return;
  const record = [...spawnedRecords().values()].find((candidate) => candidate.pane === target || candidate.handle === target);
  if (record?.owner && !ownsAgent(record)) {
    die(`Target "${target}" is owned by ${record.owner}. Use --force to override.`);
  }
}

export function callerWorkspace(): string | null {
  const backend = resolveBackend({ configured: loadConfig(orchDir()).defaults.backend ?? null });
  return backend.currentIdentity?.()?.workspace ?? null;
}

export function backendTarget(target: string, command: string): { backend: Backend; handle: string } {
  const ent = resolveTarget(target);
  const id = parseIdentity(ent.key);
  const backend = getBackend(id.backend);
  if (!backend) die(`orch ${command}: backend ${JSON.stringify(id.backend)} is not registered.`);
  // Resolve the user-facing target once, then pass the backend's real pane
  // handle. Names are display metadata; herdr pane commands require paneId.
  return { backend, handle: ent.paneId ?? id.handle };
}

export interface LifecycleTarget {
  readonly entity: Entity;
  readonly record: SpawnedRecord;
  readonly backend: Backend;
  /** Backend-native handle, or a headless pid/key signal handle. */
  readonly handle: BackendHandle;
}

function registryTargetMatches(record: SpawnedRecord, target: string): boolean {
  if (record.pane === target || record.handle === target) return true;
  try {
    const id = parseIdentity(record.pane);
    return id.handle === target;
  } catch {
    return false;
  }
}

/**
 * Resolve lifecycle targets from orch's registry, not the current workspace.
 * Close is cleanup, so it must still resolve a dead or headless record after
 * the backend has stopped reporting the pane.
 */
export function resolveLifecycleTarget(target: string): LifecycleTarget {
  const currentRecords = spawnedRecords();
  const entities = buildEntities();
  const records = [...currentRecords.values()].filter((record) => registryTargetMatches(record, target)
    || entities.some((entity) => entity.key === record.pane && entity.name === target));
  if (records.length > 1) die(`Ambiguous target "${target}".`);
  const record = records[0];
  if (!record) {
    const ent = resolveTarget(target, { all: true });
    const id = parseIdentity(ent.key);
    const backend = getBackend(id.backend);
    if (!backend) die(`Target "${target}" uses unknown backend ${JSON.stringify(id.backend)}.`);
    return { entity: ent, record: { pane: ent.key, backend: id.backend, handle: ent.paneId ?? id.handle }, backend, handle: ent.paneId ?? id.handle };
  }

  const id = parseIdentity(record.pane);
  const backend = getBackend(record.backend ?? id.backend);
  if (!backend) die(`Target "${target}" uses unknown backend ${JSON.stringify(record.backend ?? id.backend)}.`);
  const ent = buildEntities().find((candidate) => candidate.key === record.pane)
    ?? {
      key: record.pane,
      paneId: record.handle ?? null,
      name: id.handle,
      tabLabel: null,
      agent: record.adapter ?? null,
      focused: false,
      backendStatus: null,
      presence: loadPresence().get(record.pane) ?? null,
      sessionPath: null,
      presenceOnly: true,
      workspace: record.workspace ?? id.workspace,
    };
  const pid = ent.presence?.status?.pid;
  const handle = record.handle ?? ent.paneId ?? (typeof pid === "number" ? { pid, key: record.pane } : id.handle);
  return { entity: ent, record, backend, handle };
}
