import type { OrchDir } from "../types/core.ts";
import { and, asc, eq, isNotNull, isNull, type SQL } from "drizzle-orm";
import { mintAgentId } from "../backends/identity.ts";
import { isRecord } from "../util.ts";
import { orm, storeExists, withTransaction } from "./connection.ts";
import { agentEndings, agentProcesses, agentWorktrees, agents, harnesses, hostPlexers as hostPlexerTable, hosts, plexers } from "../db/schema.ts";
import { environmentOf, refreshAgent } from "./agent-view.ts";
import { currentProcess, recordProcessIn, setAgentPlexer, setHandle, setSpace } from "./interval-rows.ts";
import { closeOutboxForTarget } from "./outbox-rows.ts";
import type { AgentInput, AgentRow, AgentWorktree, ClaimResult, HostPlexerRow, SessionAgentIdentity, SessionAgentInput } from "../types/store.ts";
import type { HostOs } from "../types/host.ts";

/** An agent joined to the ending it may not have. The join is left, so `ending`
 *  is null for every live agent and carries the instant for a closed one. */
interface JoinedAgent {
  agent: typeof agents.$inferSelect;
  ending: typeof agentEndings.$inferSelect | null;
}

function mapAgent({ agent, ending }: JoinedAgent): AgentRow {
  return {
    id: agent.id, spawnedBy: agent.spawnedBy, rootAgentId: agent.rootAgentId,
    harnessId: agent.harnessId, cwd: agent.cwd, name: agent.name,
    label: agent.label, claimedAt: agent.claimedAt, sessionToken: agent.sessionToken, createdAt: agent.createdAt,
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
  const row = {
    id: input.id, spawnedBy, rootAgentId: root, harnessId: input.harnessId,
    cwd: input.cwd, name: input.name, label: input.label ?? null,
    claimedAt: null, sessionToken: null, createdAt: input.createdAt,
  };
  db.insert(agents).values(row).run();
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

export function reclaimAgent(orchDir: OrchDir, id: string): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const result = db.update(agents).set({ claimedAt: null, sessionToken: null })
      .where(eq(agents.id, id)).run();
    if (result.changes !== 1) throw new Error(`unknown agent: ${id}`);
  });
  refreshAgent(orchDir, id);
}

/** Record an agent's ending and close the writes still queued for it. An ended
 *  agent reads nothing, so a write left open only costs every other agent a turn
 *  in the retry loop. */
export function endAgent(orchDir: OrchDir, agentId: string, endedAt: number, closedBy: string | null): void {
  orm(orchDir).insert(agentEndings).values({ agentId, endedAt, closedBy }).run();
  closeOutboxForTarget(orchDir, agentId);
  refreshAgent(orchDir, agentId);
}

/** Record that an agent runs from a git worktree. No row means the repo itself. */
export function setWorktree(orchDir: OrchDir, agentId: string, path: string, branch: string): void {
  orm(orchDir).insert(agentWorktrees).values({ agentId, path, branch })
    .onConflictDoUpdate({ target: agentWorktrees.agentId, set: { path, branch } })
    .run();
  refreshAgent(orchDir, agentId);
}

export function worktreeOf(orchDir: OrchDir, agentId: string): AgentWorktree | null {
  const row = orm(orchDir)
    .select({ path: agentWorktrees.path, branch: agentWorktrees.branch })
    .from(agentWorktrees)
    .where(eq(agentWorktrees.agentId, agentId))
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

function liveProcessAgentId(orchDir: OrchDir, pid: number, startToken: string, extra: SQL | undefined): string | null {
  const row = orm(orchDir).select({ id: agents.id }).from(agents)
    .innerJoin(agentProcesses, and(eq(agentProcesses.agentId, agents.id), isNull(agentProcesses.until)))
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(
      eq(agentProcesses.pid, pid), eq(agentProcesses.startToken, startToken),
      isNull(agentEndings.agentId), extra,
    ))
    .limit(1).get();
  return row?.id ?? null;
}

/** The live agent registered as this process instance, or null. */
export function agentIdByProcess(orchDir: OrchDir, pid: number, startToken: string): string | null {
  return liveProcessAgentId(orchDir, pid, startToken, undefined);
}

/** The live session agent for one process instance and harness. A worker can
 * share a process-shaped record, so the session token and harness facts are
 * both part of this continuity lookup. */
function sessionAgentIdByProcess(orchDir: OrchDir, pid: number, startToken: string, harnessId: string): string | null {
  return liveProcessAgentId(orchDir, pid, startToken,
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
 * Both are idempotent: the plexer is an immutable one-shot, and the space
 * already open is left alone rather than reopened, so a second registration from the
 * same session opens no second interval.
 */
function placeSession(orchDir: OrchDir, agentId: string, input: SessionAgentInput): void {
  const environment = environmentOf(orchDir, agentId);
  if (input.plexerId != null && environment.plexer === null) {
    setAgentPlexer(orchDir, agentId, input.plexerId);
  }
  if (input.handle != null && environment.handle !== input.handle) {
    setHandle(orchDir, agentId, input.now, input.handle);
  }
  if (input.space != null && environment.space !== input.space) {
    setSpace(orchDir, agentId, input.now, input.space);
  }
}

/** The environment exists as soon as it is named; only the host record needs its version. */
function recordPlexer(orchDir: OrchDir, input: SessionAgentInput): void {
  if (!input.plexerId) return;
  ensurePlexer(orchDir, input.plexerId, input.plexerId);
  if (input.plexerVersion) ensureHostPlexer(orchDir, input.hostId, input.plexerId, input.plexerVersion, input.now);
}

export function getOrCreateSessionAgent(orchDir: OrchDir, input: SessionAgentInput): SessionAgentIdentity & { readonly repointed: boolean; readonly agent: SessionAgentIdentity } {
  ensureHarness(orchDir, input.harnessId, input.harnessId, input.now);
  ensureHost(orchDir, input.hostId, input.hostName, input.hostOs, input.now);
  recordPlexer(orchDir, input);
  let repointedAgentId: string | null = null;
  const identity = withTransaction<SessionAgentIdentity>(orchDir, () => {
    const db = orm(orchDir);
    const token = input.sessionToken ?? null;
    const existingByToken = token === null ? null : liveAgentId(orchDir, eq(agents.sessionToken, token));
    const existing = existingByToken
      ?? (token === null
        ? agentIdByProcess(orchDir, input.pid, input.startToken)
        : sessionAgentIdByProcess(orchDir, input.pid, input.startToken, input.harnessId));
    if (existing !== null) {
      if (token !== null && existingByToken === null) {
        db.update(agents).set({ label: input.label, sessionToken: token }).where(eq(agents.id, existing)).run();
        repointedAgentId = existing;
      } else {
        db.update(agents).set({ label: input.label }).where(eq(agents.id, existing)).run();
      }
      // The session outlives any one process instance. A superseded instance
      // closes as the current one opens; the same instance registered again
      // keeps its open interval.
      const open = currentProcess(orchDir, existing);
      if (open?.pid !== input.pid || open.startToken !== input.startToken) {
        recordProcessIn(orm(orchDir), existing, input.now, { hostId: input.hostId, pid: input.pid, startToken: input.startToken });
      }
      return { id: existing, label: input.label, kind: "session" };
    }

    const id = mintAgentId();
    db.insert(agents).values({
      id, spawnedBy: null, rootAgentId: id, harnessId: input.harnessId, cwd: input.cwd,
      name: `${input.harnessId}-${id.slice(0, 8)}`, label: input.label, sessionToken: token, createdAt: input.now,
    }).run();
    db.insert(agentProcesses).values({
      agentId: id, since: input.now, until: null, hostId: input.hostId, pid: input.pid, startToken: input.startToken,
    }).run();
    return { id, label: input.label, kind: "session" };
  });
  refreshAgent(orchDir, identity.id);
  // Placement runs AFTER the registration transaction. It is idempotent, so a
  // crash in between is repaired by the session's next registration rather than
  // leaving a second row.
  placeSession(orchDir, identity.id, input);
  return { ...identity, repointed: repointedAgentId !== null, agent: identity };
}

export function ensureHarness(orchDir: OrchDir, id: string, name: string, enabledAt: number | null = null): void {
  orm(orchDir).insert(harnesses).values({ id, name, enabledAt }).onConflictDoNothing().run();
}
export function ensurePlexer(orchDir: OrchDir, id: string, name: string, enabledAt: number | null = null): void {
  orm(orchDir).insert(plexers).values({ id, name, enabledAt }).onConflictDoNothing().run();
}
export function ensureHost(orchDir: OrchDir, id: string, name: string, os: HostOs, createdAt: number): void {
  orm(orchDir).insert(hosts).values({ id, name, os, createdAt }).onConflictDoNothing().run();
}

/** Record the currently installed version for one host/plexer pair. Upgrading
 * closes the old interval before opening exactly one new row. */
export function ensureHostPlexer(orchDir: OrchDir, hostId: string, plexerId: string, version: string, since: number): void {
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
export function hostPlexers(orchDir: OrchDir, hostId?: string, plexerId?: string): HostPlexerRow[] {
  const query = orm(orchDir).select().from(hostPlexerTable);
  const rows = hostId === undefined
    ? (plexerId === undefined ? query : query.where(eq(hostPlexerTable.plexerId, plexerId)))
    : (plexerId === undefined ? query.where(eq(hostPlexerTable.hostId, hostId)) : query.where(and(eq(hostPlexerTable.hostId, hostId), eq(hostPlexerTable.plexerId, plexerId))));
  return rows.orderBy(asc(hostPlexerTable.hostId), asc(hostPlexerTable.plexerId), asc(hostPlexerTable.since)).all()
    .map((row) => ({ hostId: row.hostId, plexerId: row.plexerId, since: row.since, until: row.until, version: row.version }));
}
