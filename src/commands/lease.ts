import { processInstanceMatches, processIsAlive } from "../process-identity.ts";
import { STATUS_FILE } from "../presence/schema.ts";
import { orchDir, presenceAgentDir, readPresenceStatus, removePresenceAgentDir } from "../presence/store.ts";
import { rpcHello } from "../daemon/reach.ts";
import { join } from "node:path";
import { asc, eq } from "drizzle-orm";
import { orm } from "../store/connection.ts";
import { agents } from "../db/schema.ts";
import { currentProcess } from "../store/interval-rows.ts";
import { agentById, childrenOf, liveAgents, renameAgent } from "../store/agent-rows.ts";
import { adoptLease, currentLease, expireLease, leasesByOrch, releaseLease } from "../store/lease-rows.ts";
import { assertValidAgentName } from "../policy/name.ts";
import type { AgentRow } from "../types/store.ts";
import type { LeaseCommandResult, LeaseOptions } from "../types/command.ts";
export type { LeaseCommandResult, LeaseOptions };

/** Transitional seam: the daemon hello identity is the caller's orch identity.
 * The agent hello rework should only need to replace this one function. */
async function resolveSelfOrchId(): Promise<string> {
  return (await rpcHello(orchDir())).id;
}



/** C4d - resolving a target to an id is ONE operation at the boundary, never a
 *  lookup re-spelled per command. C4c - names carry no uniqueness: an id always
 *  wins, a unique name resolves, and several matches is a lookup that found more
 *  than one agent and asks which id was meant. */
export function resolveTarget(directory: string, target: string): AgentRow {
  const exact = agentById(directory, target);
  if (exact) return exact;
  const rows = orm(directory).select({ id: agents.id }).from(agents)
    .where(eq(agents.name, target)).orderBy(asc(agents.id)).all();
  if (rows.length > 1) {
    const ids = rows.map((row) => row.id).join(", ");
    throw new Error(`Ambiguous target "${target}": ${rows.length} agents share that name (${ids}). Which id did you mean?`);
  }
  const only = rows[0];
  if (only) {
    const row = agentById(directory, only.id);
    if (row) return row;
  }
  throw new Error(`No agent matches "${target}".`);
}

function displayName(agent: AgentRow): string {
  return agent.name || agent.id;
}

interface RecordedProcess { readonly pid: number; readonly startToken: string | null }

function recordedProcess(directory: string, agentId: string): RecordedProcess | null {
  const row = currentProcess(directory, agentId);
  return row === undefined ? null : { pid: row.pid, startToken: row.startToken };
}

/** A recorded process is live only when its process instance still matches. An
 * un-tokened live pid remains conservatively live: reaping must ask for close. */
function processStillAlive(process: RecordedProcess | null): boolean {
  if (!process || !processIsAlive(process.pid)) return false;
  return process.startToken ? processInstanceMatches(process.pid, process.startToken) : true;
}

function liveDescendants(directory: string, parentId: string, result: AgentRow[] = []): AgentRow[] {
  for (const child of childrenOf(directory, parentId)) {
    if (!child.ending) result.push(child);
    liveDescendants(directory, child.id, result);
  }
  return result;
}

function allDescendants(directory: string, parentId: string, result: AgentRow[] = []): AgentRow[] {
  for (const child of childrenOf(directory, parentId)) {
    result.push(child);
    allDescendants(directory, child.id, result);
  }
  return result;
}

/** Release the caller's lease, or expire a stale one. An already-unleased agent
 *  is a friendly no-op.
 *
 *  Rule 11: a lease is mutual exclusion, and only a LIVE holder excludes anyone.
 *  A dead holder's lease is a stale row, and refusing to release it strands the
 *  agent permanently - every driving verb is gated on that same lease, so detach
 *  is the only way out and must never be blocked by the thing it exists to clear.
 *  C4: taking it from a LIVE orch is deliberate, and that is what --steal is. */
export function detachAgent(directory: string, target: string, orchId: string, opts: LeaseOptions = {}): LeaseCommandResult {
  const now = opts.now ?? Date.now();
  const agent = resolveTarget(directory, target);
  const lease = currentLease(directory, agent.id);
  if (!lease) return { id: agent.id, name: displayName(agent), released: false };
  if (lease.orchId !== orchId) {
    assertNotHeldByLiveForeignOrch(directory, agent, lease.orchId, orchId, opts);
    // Closed as "expired", not "released": no caller held it to release.
    expireLease(directory, agent.id, now);
    return { id: agent.id, name: displayName(agent), released: true };
  }
  releaseLease(directory, agent.id, orchId, now);
  return { id: agent.id, name: displayName(agent), released: true };
}

function holderStillAlive(directory: string, orchId: string): boolean {
  return processStillAlive(recordedProcess(directory, orchId));
}

/** C3 - the one place that answers "may this orch drive that agent?". Mutual
 *  exclusion, never authorization: only a LIVE foreign holder excludes, and only
 *  a deliberate --steal takes an agent from one. */
export function assertNotHeldByLiveForeignOrch(
  directory: string,
  agent: AgentRow,
  holderId: string,
  orchId: string,
  opts: LeaseOptions = {},
): void {
  if (holderId === orchId) return;
  if (opts.steal) return;
  if (!holderStillAlive(directory, holderId)) return;
  throw new Error(`${displayName(agent)} is leased by live orch ${holderId}.`);
}

/** Adopt an unleased agent, one whose holder is no longer alive, or - with
 *  --steal - one a live orch still holds. C5: this writes lease rows and nothing
 *  else, so the agent is not reset, not re-attached, and loses no context. */
export function adoptAgent(directory: string, target: string, orchId: string, opts: LeaseOptions = {}): LeaseCommandResult {
  const now = opts.now ?? Date.now();
  const agent = resolveTarget(directory, target);
  if (agent.ending) throw new Error(`${displayName(agent)} has ended and cannot be adopted.`);
  if (agent.id === orchId) throw new Error(`Cannot adopt the calling orch agent ${displayName(agent)}.`);
  const lease = currentLease(directory, agent.id);
  if (lease?.orchId === orchId) return { id: agent.id, name: displayName(agent), adopted: false };
  if (lease) assertNotHeldByLiveForeignOrch(directory, agent, lease.orchId, orchId, opts);
  adoptLease(directory, agent.id, orchId, now);
  return { id: agent.id, name: displayName(agent), adopted: true };
}

/** C4f - an agent may rename ITSELF with no lease in force, because acting on
 *  itself is not driving. Renaming ANOTHER agent is driving, so it meets the
 *  same live-foreign-holder gate as dispatch/steer/model/reset. */
export function renameTarget(directory: string, target: string, callerId: string, name: string): LeaseCommandResult {
  assertValidAgentName(name);
  const agent = resolveTarget(directory, target);
  if (agent.id !== callerId) {
    const lease = currentLease(directory, agent.id);
    if (lease) assertNotHeldByLiveForeignOrch(directory, agent, lease.orchId, callerId);
  }
  if (!renameAgent(directory, agent.id, name)) throw new Error(`No agent matches "${target}".`);
  return { id: agent.id, name, renamed: true };
}

/** C7 - the LIVE view groups by lease. History groups by provenance, which is
 *  `packMembers`/`childrenOf` and never this. */
export function leasedAgents(directory: string, orchId: string): AgentRow[] {
  const rows: AgentRow[] = [];
  for (const lease of leasesByOrch(directory, orchId)) {
    const agent = agentById(directory, lease.agentId);
    if (agent) rows.push(agent);
  }
  return rows;
}

/** Delete an agent subtree after proving no live descendant or process remains. */
export function reapAgent(directory: string, target: string, now = Date.now()): LeaseCommandResult {
  void now;
  const agent = resolveTarget(directory, target);
  const descendants = allDescendants(directory, agent.id);
  const live = liveDescendants(directory, agent.id);
  if (live.length) {
    const names = live.map((child) => `${displayName(child)} (${child.id})`).join(", ");
    throw new Error(`Cannot reap ${displayName(agent)}: live descendants: ${names}.`);
  }
  const status = readPresenceStatus(join(presenceAgentDir(agent.id, directory), STATUS_FILE));
  const statusProcess = typeof status?.pid === "number" ? { pid: status.pid, startToken: null } : null;
  if (processStillAlive(recordedProcess(directory, agent.id)) || processStillAlive(statusProcess)) {
    throw new Error(`Cannot reap ${displayName(agent)}: process is still running; close first.`);
  }
  // Foreign leases never gate ending/reaping. Delete descendants first because
  // agents.spawned_by intentionally has no ON DELETE CASCADE.
  const db = orm(directory);
  for (const child of [...descendants].reverse()) db.delete(agents).where(eq(agents.id, child.id)).run();
  db.delete(agents).where(eq(agents.id, agent.id)).run();
  for (const child of descendants) removePresenceAgentDir(presenceAgentDir(child.id, directory));
  removePresenceAgentDir(presenceAgentDir(agent.id, directory));
  return { id: agent.id, name: displayName(agent), reaped: true };
}

function parseTarget(args: string[], usage: string): { target: string; json: boolean; steal: boolean } {
  const json = args.includes("--json");
  const steal = args.includes("--steal");
  const positional = args.filter((arg) => arg !== "--json" && arg !== "--steal");
  if (positional.length !== 1) throw new Error(usage);
  return { target: positional[0]!, json, steal };
}

export async function cmdDetach(args: string[]): Promise<void> {
  const { target, json, steal } = parseTarget(args, "usage: orch detach <target> [--steal] [--json]");
  const result = detachAgent(orchDir(), target, await resolveSelfOrchId(), { steal });
  if (json) process.stdout.write(JSON.stringify({ target: result.id, name: result.name, released: result.released }) + "\n");
  else process.stdout.write(result.released ? `Detached ${result.name}.\n` : `${result.name}: no lease (already detached).\n`);
}

export async function cmdAdopt(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const all = args.includes("--all");
  const steal = args.includes("--steal");
  const positional = args.filter((arg) => arg !== "--json" && arg !== "--all" && arg !== "--steal");
  if ((!all && positional.length !== 1) || (all && positional.length)) throw new Error("usage: orch adopt <target> | --all [--steal] [--json]");
  // C4: --steal takes ONE agent from ONE live orch, deliberately. A sweep that
  // silently took every live orch's fleet would be the opposite of deliberate.
  if (all && steal) throw new Error("orch adopt --all never steals; name the agent to take it from a live orch.");
  const orchId = await resolveSelfOrchId();
  const results: LeaseCommandResult[] = [];
  if (all) {
    for (const agent of liveAgents(orchDir())) {
      if (agent.id === orchId) continue;
      try { results.push(adoptAgent(orchDir(), agent.id, orchId)); } catch (error: unknown) {
        if (error instanceof Error && error.message.toLowerCase().includes("leased by live orch")) continue;
        throw error;
      }
    }
  } else {
    results.push(adoptAgent(orchDir(), positional[0]!, orchId, { steal }));
  }
  const adopted = results.filter((result) => result.adopted);
  if (json) process.stdout.write(JSON.stringify({ adopted: adopted.map((result) => ({ target: result.id, name: result.name })) }) + "\n");
  else if (!adopted.length) process.stdout.write("No orphan agents to adopt.\n");
  else for (const result of adopted) process.stdout.write(`Adopted ${result.name}.\n`);
}

export async function cmdReap(args: string[]): Promise<void> {
  const { target, json } = parseTarget(args, "usage: orch reap <target> [--json]");
  const result = reapAgent(orchDir(), target);
  if (json) process.stdout.write(JSON.stringify({ target: result.id, name: result.name, reaped: true }) + "\n");
  else process.stdout.write(`Reaped ${result.name}.\n`);
  await Promise.resolve();
}
