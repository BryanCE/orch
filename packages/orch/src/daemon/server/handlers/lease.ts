import type { OrchDir } from "../../../types/core.ts";
// Ownership writes, served by orchd. A lease is mutual exclusion (Rule 11): only
// a LIVE foreign holder excludes anyone, and only a deliberate --steal takes an
// agent from one. The CLI parses and prints; every row is written here.
import { asc, eq } from "drizzle-orm";
import { orm } from "../../../store/connection.ts";
import { agents } from "../../../db/schema.ts";
import { agentById, childrenOf, liveAgents, renameAgent } from "../../../store/agent-rows.ts";
import { adoptLease, currentLease, expireLease, leasesByOrch, releaseLease } from "../../../store/lease-rows.ts";
import { recordedProcessIsLive } from "../../../store/interval-rows.ts";
import { reapAgentRecord } from "../../../presence/store.ts";
import { deriveDriveState, DEAD_HOLDER_DRIVER } from "../../../agent/drive-state.ts";
import { assertValidAgentName } from "../../../policy/name.ts";
import type { AgentRow } from "../../../types/store.ts";
import type { LeaseOptions, ReapCandidate, ReapCandidateInput, ReapOwnership } from "../../../types/command.ts";
import type { Governance, ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

/** The orch a lease verb acts as. A caller with no registered identity holds nothing. */
function actorOrDie(params: Governance): string {
  if (params.actor === undefined) throw new Error("this orch is not registered; spawn or adopt an agent first");
  return params.actor;
}

/** C4d - resolving a target to an id is ONE operation at the boundary, never a
 *  lookup re-spelled per command. C4c - names carry no uniqueness: an id always
 *  wins, a unique name resolves, and several matches is a lookup that found more
 *  than one agent and asks which id was meant. */
export function resolveTarget(directory: OrchDir, target: string): AgentRow {
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

function liveDescendants(directory: OrchDir, parentId: string, result: AgentRow[] = []): AgentRow[] {
  for (const child of childrenOf(directory, parentId)) {
    if (!child.ending) result.push(child);
    liveDescendants(directory, child.id, result);
  }
  return result;
}

function allDescendants(directory: OrchDir, parentId: string, result: AgentRow[] = []): AgentRow[] {
  for (const child of childrenOf(directory, parentId)) {
    result.push(child);
    allDescendants(directory, child.id, result);
  }
  return result;
}

/** C3 - the one place that answers "may this orch drive that agent?". Mutual
 *  exclusion, never authorization: only a LIVE foreign holder excludes, and only
 *  a deliberate --steal takes an agent from one. */
function assertNotHeldByLiveForeignOrch(directory: OrchDir, agent: AgentRow, holderId: string, orchId: string | undefined, opts: LeaseOptions = {}): void {
  if (holderId === orchId) return;
  if (opts.steal) return;
  if (!recordedProcessIsLive(directory, holderId)) return;
  throw new Error(`${displayName(agent)} is leased by live orch ${holderId}.`);
}

/** Release the caller's lease, or expire a stale one. An already-unleased agent
 *  is a friendly no-op.
 *
 *  Rule 11: a lease is mutual exclusion, and only a LIVE holder excludes anyone.
 *  A dead holder's lease is a stale row, and refusing to release it strands the
 *  agent permanently - every driving verb is gated on that same lease, so detach
 *  is the only way out and must never be blocked by the thing it exists to clear.
 *  C4: taking it from a LIVE orch is deliberate, and that is what --steal is. */
export function detachAgent(directory: OrchDir, target: string, orchId: string, opts: LeaseOptions = {}): ResultOf<"detach"> {
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

/** Adopt an unleased agent, one whose holder is no longer alive, or - with
 *  --steal - one a live orch still holds. C5: this writes lease rows and nothing
 *  else, so the agent is not reset, not re-attached, and loses no context. */
export function adoptAgent(directory: OrchDir, target: string, orchId: string, opts: LeaseOptions = {}): ResultOf<"adopt">["results"][number] {
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
export function renameTarget(directory: OrchDir, target: string, callerId: string | undefined, name: string): ResultOf<"rename"> {
  assertValidAgentName(name);
  const agent = resolveTarget(directory, target);
  const lease = agent.id === callerId ? undefined : currentLease(directory, agent.id);
  if (lease) assertNotHeldByLiveForeignOrch(directory, agent, lease.orchId, callerId);
  if (!renameAgent(directory, agent.id, name)) throw new Error(`No agent matches "${target}".`);
  return { id: agent.id, name };
}

/** C7 - the LIVE view groups by lease. History groups by provenance, which is
 *  `packMembers`/`childrenOf` and never this. */
export function leasedAgents(directory: OrchDir, orchId: string): AgentRow[] {
  const rows: AgentRow[] = [];
  for (const lease of leasesByOrch(directory, orchId)) {
    const agent = agentById(directory, lease.agentId);
    if (agent) rows.push(agent);
  }
  return rows;
}

/** Delete an agent subtree after proving no live descendant or process remains. */
export function reapAgent(directory: OrchDir, target: string): ResultOf<"reap">["reaped"][number] {
  const agent = resolveTarget(directory, target);
  const descendants = allDescendants(directory, agent.id);
  const live = liveDescendants(directory, agent.id);
  if (live.length) {
    const names = live.map((child) => `${displayName(child)} (${child.id})`).join(", ");
    throw new Error(`Cannot reap ${displayName(agent)}: live descendants: ${names}.`);
  }
  if (recordedProcessIsLive(directory, agent.id)) {
    throw new Error(`Cannot reap ${displayName(agent)}: process is still running; close first.`);
  }
  // Foreign leases never gate ending/reaping. Delete descendants first because
  // agents.spawned_by intentionally has no ON DELETE CASCADE. JSONL history stays.
  for (const child of [...descendants].reverse()) reapAgentRecord(child.id, directory);
  reapAgentRecord(agent.id, directory);
  return { id: agent.id, name: displayName(agent) };
}

/** Classify a candidate without reading the store or inspecting processes. */
export function reapCandidates(rows: readonly ReapCandidateInput[]): ReapCandidate[] {
  return rows.map((row) => {
    let classification: ReapCandidate["classification"];
    switch (row.ownership.kind) {
      case "leased":
        classification = "held";
        break;
      case "unleased":
        classification = row.processLive ? "idle" : "dead";
        break;
      default: {
        const exhaustive: never = row.ownership;
        return exhaustive;
      }
    }
    return { ...row, classification };
  });
}

function reapOwnership(directory: OrchDir, agentId: string, callerId: string): ReapOwnership {
  const drive = deriveDriveState(agentId, { directory, currentOrchId: callerId });
  switch (drive.kind) {
    case "leased":
      return { kind: "leased", holder: drive.owner };
    case "unleased":
      return { kind: "unleased", reason: drive.owner === DEAD_HOLDER_DRIVER ? "holder-gone" : "none" };
    default: {
      const exhaustive: never = drive.kind;
      return exhaustive;
    }
  }
}

function classifiedReapCandidates(directory: OrchDir, callerId: string): ReapCandidate[] {
  const inputs = liveAgents(directory)
    .filter((agent) => agent.id !== callerId && agent.sessionToken === null)
    .map((agent): ReapCandidateInput => ({
      id: agent.id,
      name: displayName(agent),
      harnessId: agent.harnessId,
      createdAt: agent.createdAt,
      ownership: reapOwnership(directory, agent.id, callerId),
      processLive: recordedProcessIsLive(directory, agent.id),
    }));
  return reapCandidates(inputs);
}

export function detach(state: DaemonState, params: ParamsOf<"detach">): ResultOf<"detach"> {
  return detachAgent(state.directory, params.target, actorOrDie(params), { steal: params.steal });
}

/** `--all` adopts every live agent no live orch holds, and skips the ones one
 *  does: a sweep that silently took every live orch's fleet would be the
 *  opposite of deliberate. */
export function adopt(state: DaemonState, params: ParamsOf<"adopt">): ResultOf<"adopt"> {
  const directory = state.directory;
  const orchId = actorOrDie(params);
  if (params.all !== true) {
    if (params.target === undefined) throw new Error("adopt names a target or asks for --all");
    return { results: [adoptAgent(directory, params.target, orchId, { steal: params.steal })] };
  }
  const results: ResultOf<"adopt">["results"] = [];
  for (const agent of liveAgents(directory)) {
    if (agent.id === orchId) continue;
    try { results.push(adoptAgent(directory, agent.id, orchId)); } catch (error: unknown) {
      if (error instanceof Error && error.message.toLowerCase().includes("leased by live orch")) continue;
      throw error;
    }
  }
  return { results };
}

export function rename(state: DaemonState, params: ParamsOf<"rename">): ResultOf<"rename"> {
  return renameTarget(state.directory, params.target, params.actor, params.name);
}

export function reapCandidateList(state: DaemonState, params: ParamsOf<"reap-candidates">): ResultOf<"reap-candidates"> {
  return { candidates: classifiedReapCandidates(state.directory, actorOrDie(params)) };
}

export function reap(state: DaemonState, params: ParamsOf<"reap">): ResultOf<"reap"> {
  const directory = state.directory;
  if (params.dead === true) {
    const dead = classifiedReapCandidates(directory, actorOrDie(params)).filter((candidate) => candidate.classification === "dead");
    return { reaped: dead.map((candidate) => reapAgent(directory, candidate.id)) };
  }
  if (params.target === undefined) throw new Error("reap names a target or asks for --dead");
  return { reaped: [reapAgent(directory, params.target)] };
}
