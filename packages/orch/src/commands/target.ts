import { getBackend } from "../backends/registry.ts";
import { isAgentId } from "../backends/identity.ts";
import { viewForKey } from "../entities/lookup.ts";
import { resolveTarget } from "../entities/resolve.ts";
import { resolveLifecycleTargetFor } from "../entities/lifecycle.ts";
import { parseTarget } from "../entities/target.ts";
import { callerSpace, selfId, spaceOfAgent } from "../identity/self.ts";
import { callerCredential } from "../identity/credential.ts";
import { callerKind } from "../policy/caller.ts";
import { operatorControls } from "../policy/space.ts";
import { term } from "../policy/vocabulary.ts";
import { runSSH } from "../remote.ts";
import { loadPresence, spawnedRecords } from "../presence/store.ts";
import { currentLease } from "../store/lease-rows.ts";
import { errorMessage, isRecord } from "../util.ts";
import { die } from "../refusal.ts";
import type { Backend } from "../types/backend.ts";
import type { AgentView } from "../types/store.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";
import type { LifecycleTarget } from "../types/command.ts";
import type { Entity, OrchDir } from "../types/core.ts";

export { die } from "../refusal.ts";

export function firstNonEmptyText(...values: (string | null | undefined)[]): string {
  return values.find((value) => Boolean(value)) ?? "";
}

export function resultText(value: unknown): string | undefined {
  return isRecord(value) && typeof value.text === "string" ? value.text : undefined;
}

export function requirePresenceTarget(root: OrchDir, settings: OrchSettings, target: string): Entity {
  const ent = resolveTarget(root, settings, target);
  if (!ent.presence) die(`Target "${target}" has no agent dir.`);
  return ent;
}

function looksLikePaneKey(key: string): boolean {
  return isAgentId(key);
}

/** The live lease holder for one identity key, or null when nothing holds it. */
function leaseHolderOf(orchDir: OrchDir, key: string): string | null {
  if (!isAgentId(key)) return null;
  try {
    return currentLease(orchDir, key)?.orchId ?? null;
  } catch {
    return null;
  }
}

export function livePanePresenceEntries(root: OrchDir): PresenceEntry[] {
  return [...loadPresence(root).values()].filter((pres) => pres.alive && looksLikePaneKey(pres.key));
}

export function targetHost(hosts: OrchSettings["hosts"], target: string): { host: string; target: string } | null {
  try {
    const ref = parseTarget(target, hosts);
    return ref.host ? { host: ref.host, target: ref.target } : null;
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

export function remoteCommandArgs(host: HostSettings, command: string, args: readonly string[]): string {
  const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
  const prefix = host.orch_dir ? `env ORCH_DIR=${quote(host.orch_dir)} ` : "";
  return `${prefix}orch ${[command, ...args].map(quote).join(" ")}`;
}

export function remoteWrite(
  hosts: OrchSettings["hosts"],
  hostName: string,
  command: string,
  args: readonly string[],
): void {
  const host = hosts[hostName];
  const destination = host?.dest;
  if (!host || !destination) die(`Host "${hostName}" has no SSH destination.`);
  const result = runSSH(destination, remoteCommandArgs(host, command, args), { timeoutMs: host.timeout_ms });
  if (!result.ok) die(`Host "${hostName}" is unreachable: ${result.stderr.trim() || "ssh failed"}`);
  if (result.stdout) process.stdout.write(result.stdout.endsWith("\n") ? result.stdout : result.stdout + "\n");
}

/** The id orch issued this process, the same id its leases are held by; undefined
 *  when orch has never registered it. */
export function callerOwnerToken(root: OrchDir): string | undefined {
  return selfId(root);
}

/** The calling orchestrator's token, or a refusal naming the fix. No operator gate: the caller acts on its own agents. */
export function ownerTokenOrDie(root: OrchDir): string {
  const token = callerOwnerToken(root);
  if (!token) die(`Bulk operation refused: this ${term("orch")} is not registered; spawn or adopt an agent first, or name the targets.`);
  return token;
}

/** Refuse bulk operations that cannot identify their calling orchestrator. */
export function requireCallerOwnerToken(root: OrchDir): string {
  forbidNonOperatorOverride(root, "--all");
  return ownerTokenOrDie(root);
}

/** True when this process was launched as an orch-spawned agent. */
export function callerIsSpawnedAgent(root: OrchDir): boolean {
  return callerKind(root) === "agent";
}

/** Owner-gate overrides are operator-only. A spawned agent may touch exactly
 *  what it spawned — no flag widens that, ever. */
export function forbidNonOperatorOverride(root: OrchDir, flag: string): void {
  if (callerKind(root) !== "operator") {
    die(`${flag} is operator-only: a driving session may only touch agents it holds.`);
  }
}

/** The space one agent is composed into. A space is an ENVIRONMENT axis read
 *  from the composer, never a segment sliced out of an identity (A1). */
/** Where the caller acts: its own space, else the space its owner token names.
 *  An operator driving orch from outside any pane still operates a space, and
 *  losing that made its own fleet foreign to it. */
export function actorSpace(root: OrchDir, token: string): string | null {
  return callerSpace(root) ?? spaceOfAgent(root, token);
}

/** Whether the caller may drive this agent.
 *
 *  Ownership is the OPEN lease and nothing else (Rule 11) — `heldBy`, never a
 *  column on a wide row and never a second id space. Failing that, the human
 *  operator of a space controls every agent composed into it. */
export function ownsAgent(orchDir: OrchDir, agent: Pick<AgentView, "id" | "heldBy">): boolean {
  const token = callerOwnerToken(orchDir);
  if (!token) return false;
  if (agent.heldBy?.orchId === token) return true;
  return !callerIsSpawnedAgent(orchDir)
    && operatorControls(orchDir, token, agent.id, actorSpace(orchDir, token), true);
}

export function assertAgentOwned(
  orchDir: OrchDir,
  target: string,
  entity: Pick<Entity, "key">,
  force = false,
  views?: ReadonlyMap<string, AgentView>,
): void {
  if (force) {
    forbidNonOperatorOverride(orchDir, "--force");
    return;
  }
  // Ownership is the open lease and nothing else. A closed one is history, and
  // history never gates a write (Rule 11).
  const holder = views ? viewForKey(views, entity.key)?.heldBy?.orchId ?? null : leaseHolderOf(orchDir, entity.key);
  if (holder !== null && !ownsAgent(orchDir, { id: entity.key, heldBy: { orchId: holder, since: 0 } })) {
    die(`Target "${target}" is owned by ${holder}. Use --force to override.`);
  }
}

export function backendTarget(
  orchDir: OrchDir,
  settings: OrchSettings,
  target: string,
  command: string,
  views?: ReadonlyMap<string, AgentView>,
): { backend: Backend; handle: string; key: string } {
  const ent = resolveTarget(orchDir, settings, target);
  // The plexer is an ENVIRONMENT axis composed onto the agent, never a segment
  // of its key: an agent that moves plexers keeps the identity it was minted with.
  const view = viewForKey(views ?? spawnedRecords(orchDir), ent.key);
  const plexer = view?.environment.plexer ?? ent.backend;
  const backend = plexer === null ? undefined : getBackend(plexer);
  if (!backend) die(`orch ${command}: backend ${JSON.stringify(plexer)} is not registered.`);
  // Resolve the user-facing target once, then pass the backend's real pane
  // handle. Names are display metadata; herdr pane commands require paneId.
  // A headless target has no pane handle; retain its identity so the command
  // boundary can return a successful no-pane answer without touching a provider.
  const handle = ent.paneId ?? view?.environment.handle ?? ent.key;
  return { backend, handle, key: ent.key };
}

export function resolveLifecycleTarget(orchDir: OrchDir, settings: OrchSettings, target: string): LifecycleTarget {
  return resolveLifecycleTargetFor(orchDir, settings, callerCredential(), target);
}
