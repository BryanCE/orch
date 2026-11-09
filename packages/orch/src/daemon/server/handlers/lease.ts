import type { OrchDir } from "../../../types/core.ts";
// Ownership writes, served by orchd. A lease is mutual exclusion (Rule 11): only
// a LIVE foreign holder excludes anyone, and only a deliberate --steal takes an
// agent from one. The CLI parses and prints; every row is written here.
import { asc, eq } from "drizzle-orm";
import { orm } from "../../../store/connection.ts";
import { agents } from "../../../db/schema.ts";
import { agentById, childrenOf, liveAgents, renameAgent } from "../../../store/agent-rows.ts";
import { adoptLease, currentLease, expireLease, leasesByOrch, releaseLease } from "../../../store/lease-rows.ts";
import { loadPresence, reapAgentRecord } from "../../../presence/store.ts";
import { agentView, agentViews } from "../../../store/agent-view.ts";
import { deriveDriveState } from "../../../agent/drive-state.ts";
import { DEAD_HOLDER_DRIVER } from "../../../shared/drive-state.ts";
import { assertNameFree, assertValidAgentName } from "../../../policy/name.ts";
import { isOrphan, orphanAgents } from "../../../policy/orphan.ts";
import type { AgentRow } from "../../../types/store.ts";
import type { LeaseOptions, ReapCandidate, ReapCandidateInput, ReapOwnership } from "../../../types/command.ts";
import type { ChromeOutcome, Governance, ParamsOf, ResultOf } from "../../client/protocol.ts";
import { resolveTargetRoute } from "../../../control/dispatch.ts";
import { errorMessage } from "../../../util.ts";
import type { DaemonState } from "../state.ts";
import type { HereAgent } from "../../../types/agent-place.ts";
import { recordedProcessIsLive } from "../../../process-place.ts";
import { atAgentHost, driveOnHost } from "./host.ts";

/** The orch a lease verb acts as. A caller with no registered identity holds nothing. */
function actorOrDie(params: Governance): string {
  if (params.actor === undefined) throw new Error("orch has no row for this caller; run orch whoami to register it.");
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
  if (agent.spawnedBy === null) throw new Error(`${displayName(agent)} is a root (a terminal or a harness session); orch adopts only spawned agents.`);
  const lease = currentLease(directory, agent.id);
  if (lease?.orchId === orchId) return { id: agent.id, name: displayName(agent), adopted: false };
  if (lease) assertNotHeldByLiveForeignOrch(directory, agent, lease.orchId, orchId, opts);
  adoptLease(directory, agent.id, orchId, now);
  return { id: agent.id, name: displayName(agent), adopted: true };
}

/** C4f - an agent may rename ITSELF with no lease in force, because acting on
 *  itself is not driving. Renaming ANOTHER agent is driving, so it meets the
 *  same live-foreign-holder gate as dispatch/steer/model/reset. */
export function renameTarget(directory: OrchDir, target: string, callerId: string | undefined, name: string): Omit<ResultOf<"rename">, keyof ChromeOutcome> {
  const agent = resolveTarget(directory, target);
  const lease = agent.id === callerId ? undefined : currentLease(directory, agent.id);
  if (lease) assertNotHeldByLiveForeignOrch(directory, agent, lease.orchId, callerId);
  // A name is free when no live agent in the same space holds it.
  const open = new Map(agentViews(directory).filter((view) => view.endedAt === null).map((view) => [view.id, view]));
  assertNameFree(open, loadPresence(directory), name, agentView(directory, agent.id)?.environment.space ?? null);
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

type Reaped = ResultOf<"reap">["reaped"][number];

/** Delete an agent subtree after proving no live descendant or process remains. */
export function reapAgent(directory: OrchDir, target: string): Reaped {
  const agent = resolveTarget(directory, target);
  return reapResolved(directory, agent, !recordedProcessIsLive(directory, agent.id));
}

/** Delete a resolved agent's subtree. `processEnded` is whether its own process is proven
 *  gone: by this host, or by the host it ran on, which reaped it there first. */
function reapResolved(directory: OrchDir, agent: AgentRow, processEnded: boolean): Reaped {
  const descendants = allDescendants(directory, agent.id);
  const live = liveDescendants(directory, agent.id);
  if (live.length) {
    const names = live.map((child) => `${displayName(child)} (${child.id})`).join(", ");
    throw new Error(`Cannot reap ${displayName(agent)}: live descendants: ${names}.`);
  }
  if (!processEnded) {
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

/** `--all` adopts every orphan. A live holder's agent and a root (a terminal, a harness
 *  session) stay out: a sweep that took them would be the opposite of deliberate. */
export function adopt(state: DaemonState, params: ParamsOf<"adopt">): ResultOf<"adopt"> {
  const directory = state.directory;
  const orchId = actorOrDie(params);
  if (params.all !== true) {
    if (!params.targets?.length) throw new Error("adopt names its targets or asks for --all");
    return { results: params.targets.map((target) => adoptAgent(directory, target, orchId, { steal: params.steal })) };
  }
  const results: ResultOf<"adopt">["results"] = [];
  for (const agent of liveAgents(directory)) {
    if (agent.id !== orchId && isOrphan(directory, agent)) results.push(adoptAgent(directory, agent.id, orchId));
  }
  return { results };
}

/** What `orch adopt` lists before the caller names any: every live orphan. */
export function orphans(state: DaemonState): ResultOf<"orphans"> {
  return { agents: orphanAgents(state.directory) };
}

/** `rename`: orch's name is written here first and alone, then the agent's pane shows it where
 *  the agent runs; one on a linked host is renamed by that host's orchd in its own store and
 *  pane. A border that could not follow is reported, and never undoes the rename. */
export async function rename(state: DaemonState, params: ParamsOf<"rename">): Promise<ResultOf<"rename">> {
  const renamed = renameTarget(state.directory, params.target, params.actor, params.name);
  const chrome = await atAgentHost(state, renamed.id, {
    here: (agent) => showName(state, agent, renamed.name),
    there: async (link) => {
      const { chrome: shown, chromeError } = await driveOnHost(state, link, { action: "rename", key: renamed.id, name: renamed.name, actor: params.actor ?? null });
      return { chrome: shown, chromeError };
    },
  });
  return { ...renamed, ...chrome };
}

/** Rename an agent this orchd runs, for a rename a linked host's orchd ruled on, and show it. */
export function renameHere(state: DaemonState, agent: HereAgent, name: string): ChromeOutcome {
  assertValidAgentName(name);
  if (!renameAgent(state.directory, agent.id, name)) throw new Error(`No agent matches "${agent.id}".`);
  return showName(state, agent, name);
}

/** Let the agent's environment show its new name: the plexer's agent name, then its pane
 *  border. An environment with neither has nothing to show, which is an answer (E14). */
function showName(state: DaemonState, agent: HereAgent, name: string): ChromeOutcome {
  const route = resolveTargetRoute(state.directory, agent);
  if (route === undefined) return { chrome: "none", chromeError: null };
  const { backend, handle } = route;
  try {
    backend.agentNaming?.renameAgent(handle, name);
    if (backend.labeling === null) return { chrome: "none", chromeError: null };
    backend.labeling.setLabel(handle, name);
    return { chrome: "renamed", chromeError: null };
  } catch (error: unknown) {
    const message = errorMessage(error);
    state.services.logger.warn("rename.chrome-failed", { handle: String(handle), error: message }, { agentId: agent.id });
    return { chrome: "failed", chromeError: message };
  }
}

export function reapCandidateList(state: DaemonState, params: ParamsOf<"reap-candidates">): ResultOf<"reap-candidates"> {
  return { candidates: classifiedReapCandidates(state.directory, actorOrDie(params)) };
}

/** Reap an agent where it runs. One on a linked host is reaped by that host's orchd first,
 *  which proves its process gone; then this host drops its own record of it. Never gated by a
 *  lease (Rule 11). */
async function reapAnywhere(state: DaemonState, target: string, actor: string | null): Promise<Reaped> {
  const directory = state.directory;
  const agent = resolveTarget(directory, target);
  const here = (): Reaped => reapAgent(directory, agent.id);
  return atAgentHost(state, agent.id, {
    here,
    there: async (link) => {
      await driveOnHost(state, link, { action: "reap", key: agent.id, actor });
      return reapResolved(directory, agent, true);
    },
  });
}

/** Reap an agent this host runs, for a linked host's orchd that asked for it. One already gone
 *  from this store is nothing to reap. */
export function reapForPeer(directory: OrchDir, key: string): Reaped[] {
  return agentById(directory, key) === null ? [] : [reapAgent(directory, key)];
}

export async function reap(state: DaemonState, params: ParamsOf<"reap">): Promise<ResultOf<"reap">> {
  const actor = params.actor ?? null;
  if (params.dead === true) {
    const dead = classifiedReapCandidates(state.directory, actorOrDie(params)).filter((candidate) => candidate.classification === "dead");
    const reaped: Reaped[] = [];
    for (const candidate of dead) reaped.push(await reapAnywhere(state, candidate.id, actor));
    return { reaped };
  }
  if (params.target === undefined) throw new Error("reap names a target or asks for --dead");
  return { reaped: [await reapAnywhere(state, params.target, actor)] };
}
