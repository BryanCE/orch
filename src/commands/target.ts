import { loadConfig, type HostConfig } from "../config.ts";
import { allBackends, getBackend, resolveBackend } from "../backends/registry.ts";
import type { Backend } from "../backends/backend.ts";
import { parseIdentity, tryParseIdentity } from "../backends/identity.ts";
import { parseTarget, resolveTarget, type Entity } from "../entities.ts";
import { runSSH } from "../remote.ts";
import { loadPresence, orchDir, spawnedRecords, type PresenceEntry } from "../presence/store.ts";
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
  if (process.env.ORCH_OWNER) return process.env.ORCH_OWNER;
  for (const backend of allBackends()) {
    const token = backend.callerIdentity?.();
    if (token) return token;
  }
  return undefined;
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
