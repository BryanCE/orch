import { processInstanceMatches, processIsAlive } from "../process-identity.ts";
import { STATUS_FILE } from "../presence/schema.ts";
import { orchDir, presenceAgentDir, readPresenceStatus, removePresenceAgentDir } from "../presence/store.ts";
import { rpcHello } from "../daemon/rpc.ts";
import { join } from "node:path";
import { openStore } from "../store/connection.ts";
import { agentById, childrenOf, liveAgents, type AgentRow } from "../store/agent-rows.ts";
import { adoptLease, currentLease, releaseLease } from "../store/lease-rows.ts";

export interface LeaseCommandResult {
  readonly id: string;
  readonly name: string;
  readonly released?: boolean;
  readonly adopted?: boolean;
  readonly reaped?: boolean;
}

/** Transitional seam: the daemon hello identity is the caller's orch identity.
 * The agent hello rework should only need to replace this one function. */
async function resolveSelfOrchId(): Promise<string> {
  return (await rpcHello(orchDir())).id;
}

function lookupAgent(directory: string, target: string): AgentRow {
  const exact = agentById(directory, target);
  if (exact) return exact;
  const rows = openStore(directory).query(
    `SELECT a.id, a.spawned_by, a.root_agent_id, a.harness_id, a.cwd, a.name, a.label, a.created_at,
            e.ended_at, e.closed_by
       FROM agents a LEFT JOIN agent_endings e ON e.agent_id = a.id
      WHERE a.name = ? ORDER BY a.id`,
  ).all(target) as Record<string, unknown>[];
  if (rows.length > 1) throw new Error(`Ambiguous target "${target}".`);
  if (rows.length === 1) {
    const row = rows[0]!;
    return agentById(directory, String(row.id))!;
  }
  throw new Error(`No agent matches "${target}".`);
}

function displayName(agent: AgentRow): string {
  return agent.name || agent.id;
}

function currentProcess(directory: string, agentId: string): { pid: number; startToken?: string | null } | null {
  const row = openStore(directory).query(
    "SELECT pid, start_token FROM agent_processes WHERE agent_id = ? AND until IS NULL",
  ).get(agentId) as { pid?: unknown; start_token?: unknown } | null;
  if (!row || typeof row.pid !== "number") return null;
  return { pid: row.pid, startToken: typeof row.start_token === "string" ? row.start_token : null };
}

/** A recorded process is live only when its process instance still matches. An
 * un-tokened live pid remains conservatively live: reaping must ask for close. */
function processStillAlive(process: { pid: number; startToken?: string | null } | null): boolean {
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

/** Release only the caller's lease. An already-unleased agent is a friendly no-op. */
export function detachAgent(directory: string, target: string, orchId: string, now = Date.now()): LeaseCommandResult {
  const agent = lookupAgent(directory, target);
  const lease = currentLease(directory, agent.id);
  if (!lease) return { id: agent.id, name: displayName(agent), released: false };
  if (lease.orchId !== orchId) throw new Error(`${displayName(agent)} is leased by ${lease.orchId}.`);
  releaseLease(directory, agent.id, orchId, now);
  return { id: agent.id, name: displayName(agent), released: true };
}

function holderStillAlive(directory: string, orchId: string): boolean {
  return processStillAlive(currentProcess(directory, orchId));
}

/** Adopt an unleased agent, or one whose current holder is no longer alive. */
export function adoptAgent(directory: string, target: string, orchId: string, now = Date.now()): LeaseCommandResult {
  const agent = lookupAgent(directory, target);
  if (agent.ending) throw new Error(`${displayName(agent)} has ended and cannot be adopted.`);
  if (agent.id === orchId) throw new Error(`Cannot adopt the calling orch agent ${displayName(agent)}.`);
  const lease = currentLease(directory, agent.id);
  if (lease?.orchId === orchId) return { id: agent.id, name: displayName(agent), adopted: false };
  if (lease && holderStillAlive(directory, lease.orchId)) {
    throw new Error(`${displayName(agent)} is leased by live orch ${lease.orchId}.`);
  }
  adoptLease(directory, agent.id, orchId, now);
  return { id: agent.id, name: displayName(agent), adopted: true };
}

/** Delete an agent subtree after proving no live descendant or process remains. */
export function reapAgent(directory: string, target: string, now = Date.now()): LeaseCommandResult {
  void now;
  const agent = lookupAgent(directory, target);
  const descendants = allDescendants(directory, agent.id);
  const live = liveDescendants(directory, agent.id);
  if (live.length) {
    const names = live.map((child) => `${displayName(child)} (${child.id})`).join(", ");
    throw new Error(`Cannot reap ${displayName(agent)}: live descendants: ${names}.`);
  }
  const status = readPresenceStatus(join(presenceAgentDir(agent.id, directory), STATUS_FILE));
  const statusProcess = typeof status?.pid === "number" ? { pid: status.pid, startToken: null } : null;
  if (processStillAlive(currentProcess(directory, agent.id)) || processStillAlive(statusProcess)) {
    throw new Error(`Cannot reap ${displayName(agent)}: process is still running; close first.`);
  }
  // Foreign leases never gate ending/reaping. Delete descendants first because
  // agents.spawned_by intentionally has no ON DELETE CASCADE.
  const db = openStore(directory);
  for (const child of [...descendants].reverse()) db.query("DELETE FROM agents WHERE id = ?").run(child.id);
  db.query("DELETE FROM agents WHERE id = ?").run(agent.id);
  for (const child of descendants) removePresenceAgentDir(presenceAgentDir(child.id, directory));
  removePresenceAgentDir(presenceAgentDir(agent.id, directory));
  return { id: agent.id, name: displayName(agent), reaped: true };
}

function parseTarget(args: string[], usage: string): { target: string; json: boolean } {
  const json = args.includes("--json");
  const positional = args.filter((arg) => arg !== "--json");
  if (positional.length !== 1) throw new Error(usage);
  return { target: positional[0]!, json };
}

export async function cmdDetach(args: string[]): Promise<void> {
  const { target, json } = parseTarget(args, "usage: orch detach <target> [--json]");
  const result = detachAgent(orchDir(), target, await resolveSelfOrchId());
  if (json) process.stdout.write(JSON.stringify({ target: result.id, name: result.name, released: result.released }) + "\n");
  else process.stdout.write(result.released ? `Detached ${result.name}.\n` : `${result.name}: no lease (already detached).\n`);
}

export async function cmdAdopt(args: string[]): Promise<void> {
  const json = args.includes("--json");
  const all = args.includes("--all");
  const positional = args.filter((arg) => arg !== "--json" && arg !== "--all");
  if ((!all && positional.length !== 1) || (all && positional.length)) throw new Error("usage: orch adopt <target> | --all [--json]");
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
    results.push(adoptAgent(orchDir(), positional[0]!, orchId));
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
