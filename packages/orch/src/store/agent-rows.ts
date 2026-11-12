import type { OrchDir } from "../types/core.ts";
import { and, asc, eq, isNotNull, isNull, type SQL } from "drizzle-orm";
import { agentIdFromRow, mintAgentId } from "../shared/agent-id.ts";
import { isRecord } from "../util.ts";
import { orm, storeExists, withTransaction } from "./connection.ts";
import { agentEndings, agentHosts, agentOrigins, agentProcesses, agentWorktrees, agents, harnesses, hostPlexers as hostPlexerTable, hosts, plexers } from "../db/schema.ts";
import { environmentOf, paneOf, refreshAgent } from "./agent-view.ts";
import { agentLocation, callerProcess, openLocationIn, recordCallerProcessIn, relocateIn, setAgentPlexer, setHandle, setSpace } from "./interval-rows.ts";
import { hereOrNull, placeAgent } from "../process-place.ts";
import { closeOutboxForTarget } from "./outbox-rows.ts";
import { acquireLease } from "./lease-rows.ts";
import type { AgentWorktree } from "../types/worktree.ts";
import type { AgentInput, AgentRow, ClaimResult, HostPlexerRow, SessionAgentIdentity, SessionAgentInput } from "../types/store.ts";
import type { AgentOrigin, HostId, HostIdentity } from "../types/host.ts";
import type { CallerKind } from "../types/policy.ts";
import { isHostOs } from "../host.ts";
import { OPERATOR_HARNESS_ID } from "../identity/operator.ts";
import type { HostedProcess } from "../types/process.ts";
import type { AgentLocation, HereAgent } from "../types/agent-place.ts";

/** An agent joined to the ending it may not have. The join is left, so `ending`
 *  is null for every live agent and carries the instant for a closed one. */
interface JoinedAgent {
  agent: typeof agents.$inferSelect;
  ending: typeof agentEndings.$inferSelect | null;
}

function mapAgent({ agent, ending }: JoinedAgent): AgentRow {
  return {
    id: agent.id, spawnedBy: agent.spawnedBy, rootAgentId: agent.rootAgentId,
    harnessId: agent.harnessId, name: agent.name,
    label: agent.label, kind: agent.kind, claimedAt: agent.claimedAt, sessionToken: agent.sessionToken, createdAt: agent.createdAt,
    ending: ending === null ? null : { endedAt: ending.endedAt, closedBy: ending.closedBy },
  };
}

function selectAgents(orchDir: OrchDir) {
  return orm(orchDir)
    .select({ agent: agents, ending: agentEndings })
    .from(agents)
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id));
}

export function insertAgent(orchDir: OrchDir, input: AgentInput): AgentRow {
  const db = orm(orchDir);
  const spawnedBy = input.spawnedBy ?? null;
  let root = input.id;
  if (spawnedBy !== null) {
    const parent = db.select({ rootAgentId: agents.rootAgentId }).from(agents).where(eq(agents.id, spawnedBy)).get();
    if (!parent) throw new Error(`unknown spawner: ${spawnedBy}`);
    root = parent.rootAgentId;
  }
  const harness = db.select({ id: harnesses.id }).from(harnesses).where(eq(harnesses.id, input.harnessId)).get();
  if (harness === undefined) throw new Error(`unknown harness: ${input.harnessId}`);
  const existing = db.select({ id: agents.id }).from(agents).where(eq(agents.id, input.id)).get();
  if (existing !== undefined) throw new Error(`agent already exists: ${input.id}`);
  const row: Omit<AgentRow, "ending"> = {
    id: input.id, spawnedBy, rootAgentId: root, harnessId: input.harnessId,
    name: input.name, label: input.label ?? null, kind: "agent",
    claimedAt: null, sessionToken: null, createdAt: input.createdAt,
  };
  ensureHost(orchDir, input.host, input.createdAt);
  db.insert(agents).values(row).run();
  openLocationIn(db, input.id, input.createdAt, input.host.id, input.cwd);
  refreshAgent(orchDir, input.id);
  return { ...row, ending: null };
}

export function claimAgent(orchDir: OrchDir, id: string, sessionToken: string, now: number): ClaimResult {
  const result = withTransaction<ClaimResult>(orchDir, () => {
    const db = orm(orchDir);
    const row = db.select({ claimedAt: agents.claimedAt, sessionToken: agents.sessionToken })
      .from(agents).where(eq(agents.id, id)).get();
    if (!row) return { kind: "refused", reason: "unknown-agent" };
    if (row.claimedAt !== null) {
      return row.sessionToken === sessionToken
        ? { kind: "unchanged" }
        : { kind: "refused", reason: "claimed-by-other" };
    }
    db.update(agents).set({ claimedAt: now, sessionToken })
      .where(and(eq(agents.id, id), isNull(agents.claimedAt))).run();
    return { kind: "stamped" };
  });
  refreshAgent(orchDir, id);
  return result;
}

/** Write fields onto one agent's row, then refresh its view. An unknown id throws. */
function updateAgentRow(orchDir: OrchDir, id: string, fields: Partial<typeof agents.$inferInsert>): void {
  const updated = orm(orchDir).update(agents).set(fields).where(eq(agents.id, id)).run();
  if (updated.changes !== 1) throw new Error(`unknown agent: ${id}`);
  refreshAgent(orchDir, id);
}

export function reclaimAgent(orchDir: OrchDir, id: string): void {
  updateAgentRow(orchDir, id, { claimedAt: null, sessionToken: null });
}

/** Move an agent onto another harness. The id, name, and pane stay. */
export function setHarness(orchDir: OrchDir, id: string, harnessId: string, now: number): void {
  ensureHarness(orchDir, harnessId, harnessId, now);
  updateAgentRow(orchDir, id, { harnessId });
}

/** Record an agent's ending and close the writes still queued for it. An ended
 *  agent reads nothing, so a write left open only costs every other agent a turn
 *  in the retry loop. */
export function endAgent(orchDir: OrchDir, agentId: string, endedAt: number, closedBy: string | null): void {
  orm(orchDir).insert(agentEndings).values({ agentId, endedAt, closedBy }).run();
  closeOutboxForTarget(orchDir, agentId);
  refreshAgent(orchDir, agentId);
}

/** Record that an agent runs from a git worktree. No row means the repo itself. A worktree is
 *  a directory on this machine, so only an agent here has one. */
export function setWorktree(orchDir: OrchDir, agent: HereAgent, worktree: AgentWorktree): void {
  orm(orchDir).insert(agentWorktrees).values({ agentId: agent.id, ...worktree })
    .onConflictDoUpdate({ target: agentWorktrees.agentId, set: worktree })
    .run();
  refreshAgent(orchDir, agent.id);
}

/** Where an agent runs: its open `agent_hosts` row. Total for every agent the store holds,
 *  since every agent row is written with one; an unknown id, or an agent with no open row,
 *  throws. The second is a corrupt store, never "here". */
export function agentHost(orchDir: OrchDir, agentId: string): AgentLocation {
  const location = agentLocation(orchDir, agentId);
  if (location !== undefined) return location;
  if (agentById(orchDir, agentId) === null) throw new Error(`unknown agent: ${agentId}`);
  throw new Error(`agent ${agentId} has no open host row: the store is corrupt. Reap the agent or rebuild the store.`);
}

/** Every host other than `except` that runs an agent this orchd has not seen end. */
export function hostsRunningLiveAgents(orchDir: OrchDir, except: HostId): Set<HostId> {
  return new Set(orm(orchDir).selectDistinct({ hostId: agentHosts.hostId }).from(agentHosts)
    .leftJoin(agentEndings, eq(agentEndings.agentId, agentHosts.agentId))
    .where(and(isNull(agentHosts.until), isNull(agentEndings.agentId))).all()
    .flatMap((row) => row.hostId === except ? [] : [row.hostId]));
}

/** Stamp the host and agent that asked for this one. Written once, with the agent row. */
export function setOrigin(orchDir: OrchDir, agentId: string, origin: AgentOrigin): void {
  orm(orchDir).insert(agentOrigins).values({ agentId, askedByHostId: origin.askedBy, spawnerId: origin.spawner }).run();
}

/** The host and agent that asked for this one; null when it was asked for on this host. */
export function originOf(orchDir: OrchDir, agentId: string): AgentOrigin | null {
  const row = orm(orchDir)
    .select({ askedBy: agentOrigins.askedByHostId, spawner: agentOrigins.spawnerId })
    .from(agentOrigins)
    .where(eq(agentOrigins.agentId, agentId))
    .get();
  return row ?? null;
}

/** For every agent another host's orchd asked this one to run: that host's name, else its id
 *  when this store never learned the name. One read for a whole fleet. */
export function askingHostNames(orchDir: OrchDir): ReadonlyMap<string, string> {
  const rows = orm(orchDir)
    .select({ agentId: agentOrigins.agentId, hostId: agentOrigins.askedByHostId, name: hosts.name })
    .from(agentOrigins)
    .leftJoin(hosts, eq(hosts.id, agentOrigins.askedByHostId))
    .all();
  return new Map(rows.map((row) => [row.agentId, row.name ?? row.hostId]));
}

/** The git worktree an agent this orchd runs works in; null when it runs from the repo itself.
 *  A worktree is a directory on this machine, so only an agent here has one. */
export function worktreeOf(orchDir: OrchDir, agent: HereAgent): AgentWorktree | null {
  const row = orm(orchDir)
    .select({ path: agentWorktrees.path, branch: agentWorktrees.branch, base: agentWorktrees.base, provider: agentWorktrees.provider })
    .from(agentWorktrees)
    .where(eq(agentWorktrees.agentId, agent.id))
    .get();
  return row ?? null;
}

/** Relabel an agent by its immutable id; names are intentionally non-unique. */
export function renameAgent(orchDir: OrchDir, agentId: string, name: string): boolean {
  const changes = orm(orchDir).update(agents).set({ name }).where(eq(agents.id, agentId)).run().changes;
  refreshAgent(orchDir, agentId);
  return changes === 1;
}

export function agentById(orchDir: OrchDir, id: string): AgentRow | null {
  const row = selectAgents(orchDir).where(eq(agents.id, id)).get();
  return row ? mapAgent(row) : null;
}

export function liveAgents(orchDir: OrchDir): AgentRow[] {
  return selectAgents(orchDir).where(isNull(agentEndings.agentId)).orderBy(agents.id).all().map(mapAgent);
}

export function packMembers(orchDir: OrchDir, rootAgentId: string): AgentRow[] {
  return selectAgents(orchDir).where(eq(agents.rootAgentId, rootAgentId)).orderBy(agents.id).all().map(mapAgent);
}

export function childrenOf(orchDir: OrchDir, spawnedBy: string): AgentRow[] {
  return selectAgents(orchDir).where(eq(agents.spawnedBy, spawnedBy)).orderBy(agents.id).all().map(mapAgent);
}

/** A session registration response is backed by the one agent entity.
 * An ending makes the named agent non-live. */
export function isLiveAgentIdentity(orchDir: OrchDir, value: unknown): value is SessionAgentIdentity {
  if (!isRecord(value)
    || typeof value.id !== "string" || value.id.length === 0
    || typeof value.label !== "string" || value.kind !== "session") return false;
  return liveAgentId(orchDir, eq(agents.id, value.id)) !== null;
}

/** A process instance names an agent only on its own host, and only with a start token:
 *  the same pid on two hosts is two processes, and a bare pid proves nothing. */
function liveProcessAgentId(orchDir: OrchDir, process: HostedProcess, extra: SQL | undefined): string | null {
  if (process.startToken === null) return null;
  const row = orm(orchDir).select({ id: agents.id }).from(agents)
    .innerJoin(agentProcesses, and(eq(agentProcesses.agentId, agents.id), isNull(agentProcesses.until)))
    .innerJoin(agentHosts, and(eq(agentHosts.agentId, agents.id), isNull(agentHosts.until)))
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(
      eq(agentHosts.hostId, process.host), eq(agentProcesses.pid, process.pid), eq(agentProcesses.startToken, process.startToken),
      isNull(agentEndings.agentId), extra,
    ))
    .limit(1).get();
  return row?.id ?? null;
}

/** Every pid an un-ended agent row runs as now on one host. */
export function liveProcessPids(orchDir: OrchDir, host: HostId): Set<number> {
  return new Set(orm(orchDir).select({ pid: agentProcesses.pid }).from(agentProcesses)
    .innerJoin(agentHosts, and(eq(agentHosts.agentId, agentProcesses.agentId), isNull(agentHosts.until)))
    .leftJoin(agentEndings, eq(agentEndings.agentId, agentProcesses.agentId))
    .where(and(eq(agentHosts.hostId, host), isNull(agentProcesses.until), isNull(agentEndings.agentId))).all().map((row) => row.pid));
}

/** The live agent registered as this process instance, or null. */
export function agentIdByProcess(orchDir: OrchDir, process: HostedProcess): string | null {
  return liveProcessAgentId(orchDir, process, undefined);
}

/** The live session agent for one process instance and harness. A worker can
 * share a process-shaped record, so the session token and harness facts are
 * both part of this continuity lookup. */
function sessionAgentIdByProcess(orchDir: OrchDir, process: HostedProcess, harnessId: string): string | null {
  return liveProcessAgentId(orchDir, process,
    and(eq(agents.harnessId, harnessId), isNotNull(agents.sessionToken)));
}

/** Register a caller as an agent.
 *
 * Continuity comes from the harness's own session token when it exports one:
 * that is the ONLY key that stays put for a session's whole life, because the
 * `orch` CLI is short-lived and every invocation runs under a different shell.
 * Keying on the process pair alone re-minted an identity on every command
 * (measured: 22 agent rows for one session), which then matched no lease holder
 * and reported itself dead. A harness exporting no token falls back to its open
 * process instance. Pids are never identities either way. */
/** The agent orch registered for one harness session, by that harness's own
 *  stable session token. This is the id a driving session ACTS as: its lease is
 *  held by it, so anything else can never match and orch refuses its own fleet. */
export function agentIdBySessionToken(orchDir: OrchDir, sessionToken: string): string | null {
  // B6: this is a LOOKUP, and it runs on `orch status --offline`. Opening the
  // store creates it and applies every migration, so asking "who am I" on a
  // machine that has never run orch would leave a store behind. No store means
  // no registered session, which is the honest answer.
  if (!storeExists(orchDir)) return null;
  return liveAgentId(orchDir, eq(agents.sessionToken, sessionToken));
}

/** The id of the one agent matching `where` that has NOT ended, or null.
 *  An ending is what makes an agent non-live, so every "who is this" lookup
 *  joins it — and there is one spelling of that join. */
function liveAgentId(orchDir: OrchDir, where: SQL): string | null {
  const row = orm(orchDir).select({ id: agents.id }).from(agents)
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(where, isNull(agentEndings.agentId))).limit(1).get();
  return row?.id ?? null;
}


/**
 * B9: record the registering session's own environment at registration.
 *
 * `host_plexers` says which plexer is INSTALLED on a machine (E17); it does not
 * say where this agent is. The agent's own axes are satellites (A14), so they
 * are written here rather than inferred at use — what an agent can do is
 * dictated by where it is, and a fact filled in later is a fact something read
 * wrong first.
 *
 * The plexer and handle name a pane on one machine, so they are written only for a session
 * placed here (`here`); a session registered from another host has none. All are idempotent:
 * the plexer is an immutable one-shot, and the space already open is left alone rather than
 * reopened, so a second registration from the same session opens no second interval.
 */
function placeSession(orchDir: OrchDir, here: HereAgent | null, agentId: string, input: SessionAgentInput): void {
  if (here !== null) placeSessionPane(orchDir, here, input);
  if (input.space != null && environmentOf(orchDir, agentId).space !== input.space) {
    setSpace(orchDir, agentId, input.now, input.space);
  }
}

/** The pane of a session placed here, read and written through the agent. */
function placeSessionPane(orchDir: OrchDir, here: HereAgent, input: SessionAgentInput): void {
  const pane = paneOf(orchDir, here);
  if (input.plexerId != null && pane.plexer === null) setAgentPlexer(orchDir, here, input.plexerId);
  if (input.handle != null && pane.handle !== input.handle) setHandle(orchDir, here, input.now, input.handle);
}

/** The environment exists as soon as it is named; only the host record needs its version. */
function recordPlexer(orchDir: OrchDir, input: SessionAgentInput): void {
  if (!input.plexerId) return;
  ensurePlexer(orchDir, input.plexerId, input.plexerId);
  if (input.plexerVersion) ensureHostPlexer(orchDir, input.host.id, input.plexerId, input.plexerVersion, input.now);
}

/** A registering caller with no harness is a raw terminal: the operator. Provenance comes
 *  first: a row with a spawner descends from an agent and is never the human, so the store
 *  refuses to write one. Such a process is the agent it was started inside. */
function registeredKind(harnessId: string, spawnedBy: string | null): Exclude<CallerKind, "agent"> {
  if (harnessId !== OPERATOR_HARNESS_ID) return "session";
  if (spawnedBy !== null) throw new Error(`a ${OPERATOR_HARNESS_ID} process started inside agent ${spawnedBy} is that agent; it is never filed as the operator`);
  return "operator";
}

export function getOrCreateSessionAgent(orchDir: OrchDir, input: SessionAgentInput): SessionAgentIdentity & { readonly repointed: boolean; readonly agent: SessionAgentIdentity } {
  ensureHarness(orchDir, input.harnessId, input.harnessId, input.now);
  ensureHost(orchDir, input.host, input.now);
  recordPlexer(orchDir, input);
  const process: HostedProcess = { host: input.host.id, pid: input.pid, startToken: input.startToken };
  let repointedAgentId: string | null = null;
  const identity = withTransaction<SessionAgentIdentity>(orchDir, () => {
    const db = orm(orchDir);
    const token = input.sessionToken ?? null;
    const existingByToken = token === null ? null : liveAgentId(orchDir, eq(agents.sessionToken, token));
    const existing = existingByToken
      ?? (token === null
        ? agentIdByProcess(orchDir, process)
        : sessionAgentIdByProcess(orchDir, process, input.harnessId));
    if (existing !== null) {
      if (token !== null && existingByToken === null) {
        db.update(agents).set({ label: input.label, sessionToken: token }).where(eq(agents.id, existing)).run();
        repointedAgentId = existing;
      } else {
        db.update(agents).set({ label: input.label }).where(eq(agents.id, existing)).run();
      }
      // A session that registers from another host moved there: its host row closes as
      // the next opens, and what named a place on the old machine goes with it. Its
      // directory is the one it first registered from on a host.
      const location = agentHost(orchDir, existing);
      if (location.host !== process.host) relocateIn(db, existing, input.now, process.host, input.cwd);
      // The session outlives any one process instance. A superseded instance
      // closes as the current one opens; the same instance registered again
      // keeps its open interval.
      const open = callerProcess(orchDir, existing);
      if (open?.host !== process.host || open.pid !== process.pid || open.startToken !== process.startToken) {
        recordCallerProcessIn(db, agentIdFromRow(existing), input.now, process);
      }
      return { id: existing, label: input.label, kind: "session" };
    }

    const id = mintAgentId();
    const parent = input.spawnedBy ? agentById(orchDir, input.spawnedBy) : null;
    db.insert(agents).values({
      id, spawnedBy: parent?.id ?? null, rootAgentId: parent?.rootAgentId ?? id, harnessId: input.harnessId,
      name: `${input.harnessId}-${id.slice(0, 8)}`, label: input.label, kind: registeredKind(input.harnessId, parent?.id ?? null),
      sessionToken: token, createdAt: input.now,
    }).run();
    openLocationIn(db, id, input.now, process.host, input.cwd);
    recordCallerProcessIn(db, id, input.now, process);
    // Whoever started it holds it, as a spawner holds its spawn.
    if (parent) acquireLease(orchDir, id, parent.id, input.now);
    return { id, label: input.label, kind: "session" };
  });
  refreshAgent(orchDir, identity.id);
  // Placement runs AFTER the registration transaction. It is idempotent, so a
  // crash in between is repaired by the session's next registration rather than
  // leaving a second row.
  placeSession(orchDir, hereOrNull(placeAgent(orchDir, identity.id)), identity.id, input);
  return { ...identity, repointed: repointedAgentId !== null, agent: identity };
}

export function ensureHarness(orchDir: OrchDir, id: string, name: string, enabledAt: number | null = null): void {
  orm(orchDir).insert(harnesses).values({ id, name, enabledAt }).onConflictDoNothing().run();
}
export function ensurePlexer(orchDir: OrchDir, id: string, name: string, enabledAt: number | null = null): void {
  orm(orchDir).insert(plexers).values({ id, name, enabledAt }).onConflictDoNothing().run();
}
export function ensureHost(orchDir: OrchDir, host: HostIdentity, createdAt: number): void {
  orm(orchDir).insert(hosts).values({ id: host.id, name: host.name, os: host.os, createdAt }).onConflictDoNothing().run();
}

/** One registered host. The `hosts_os` check holds `os` to the known values; a row that breaks it is refused. */
export function hostById(orchDir: OrchDir, id: HostId): HostIdentity | null {
  const row = orm(orchDir).select().from(hosts).where(eq(hosts.id, id)).get();
  if (!row) return null;
  if (!isHostOs(row.os)) throw new Error(`host ${id} has an unknown os ${row.os}`);
  return { id: row.id, name: row.name, os: row.os };
}

/** Record the currently installed version for one host/plexer pair. Upgrading
 * closes the old interval before opening exactly one new row. */
export function ensureHostPlexer(orchDir: OrchDir, hostId: HostId, plexerId: string, version: string, since: number): void {
  const normalized = version.trim();
  if (!normalized) throw new Error("host plexer version must not be empty");
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const current = db.select({ since: hostPlexerTable.since, version: hostPlexerTable.version }).from(hostPlexerTable)
      .where(and(eq(hostPlexerTable.hostId, hostId), eq(hostPlexerTable.plexerId, plexerId), isNull(hostPlexerTable.until))).get();
    if (current?.version === normalized) return;
    const at = current ? Math.max(since, current.since + 1) : since;
    if (current) db.update(hostPlexerTable).set({ until: at }).where(and(eq(hostPlexerTable.hostId, hostId), eq(hostPlexerTable.plexerId, plexerId), isNull(hostPlexerTable.until))).run();
    db.insert(hostPlexerTable).values({ hostId, plexerId, since: at, until: null, version: normalized }).run();
  });
}

/** Read host plexer history, or only the current open row when requested. */
export function hostPlexers(orchDir: OrchDir, hostId?: HostId, plexerId?: string): HostPlexerRow[] {
  const query = orm(orchDir).select().from(hostPlexerTable);
  const rows = hostId === undefined
    ? (plexerId === undefined ? query : query.where(eq(hostPlexerTable.plexerId, plexerId)))
    : (plexerId === undefined ? query.where(eq(hostPlexerTable.hostId, hostId)) : query.where(and(eq(hostPlexerTable.hostId, hostId), eq(hostPlexerTable.plexerId, plexerId))));
  return rows.orderBy(asc(hostPlexerTable.hostId), asc(hostPlexerTable.plexerId), asc(hostPlexerTable.since)).all()
    .map((row) => ({ hostId: row.hostId, plexerId: row.plexerId, since: row.since, until: row.until, version: row.version }));
}
