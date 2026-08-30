import { and, asc, eq, isNull, type SQL } from "drizzle-orm";
import { mintAgentId } from "../backends/identity.ts";
import { isRecord, osSide } from "../util.ts";
import { orm, storeExists, withTransaction } from "./connection.ts";
import { agentEndings, agentProcesses, agentWorktrees, agents, harnesses, hostPlexers as hostPlexerTable, hosts, plexers } from "../db/schema.ts";
import { environmentOf } from "./agent-view.ts";
import { setAgentPlexer, setSpace } from "./interval-rows.ts";
import type { AgentInput, AgentRow, AgentWorktree, HostOs, HostPlexerRow, SessionAgentIdentity, SessionAgentInput } from "../types/store.ts";

/** This machine's OS as the store names it. Throws rather than guess: an
 *  unsupported platform is a host orch cannot record, not a host it may mislabel. */
export function currentHostOs(platform: NodeJS.Platform = process.platform): HostOs {
  return osSide(platform);
}

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

function selectAgents(orchDir: string) {
  return orm(orchDir)
    .select({ agent: agents, ending: agentEndings })
    .from(agents)
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id));
}

export function insertAgent(orchDir: string, input: AgentInput): AgentRow {
  const db = orm(orchDir);
  const spawnedBy = input.spawnedBy ?? null;
  let root = input.id;
  if (spawnedBy !== null) {
    const parent = db.select({ rootAgentId: agents.rootAgentId }).from(agents).where(eq(agents.id, spawnedBy)).get();
    if (!parent) throw new Error(`unknown spawner: ${spawnedBy}`);
    root = parent.rootAgentId;
  }
  const row = {
    id: input.id, spawnedBy, rootAgentId: root, harnessId: input.harnessId,
    cwd: input.cwd, name: input.name, label: input.label ?? null,
    claimedAt: null, sessionToken: null, createdAt: input.createdAt,
  };
  db.insert(agents).values(row).run();
  return { ...row, ending: null };
}

export function endAgent(orchDir: string, agentId: string, endedAt: number, closedBy: string | null): void {
  orm(orchDir).insert(agentEndings).values({ agentId, endedAt, closedBy }).run();
}

/** Record that an agent runs from a git worktree. No row means the repo itself. */
export function setWorktree(orchDir: string, agentId: string, path: string, branch: string): void {
  orm(orchDir).insert(agentWorktrees).values({ agentId, path, branch })
    .onConflictDoUpdate({ target: agentWorktrees.agentId, set: { path, branch } })
    .run();
}

export function worktreeOf(orchDir: string, agentId: string): AgentWorktree | null {
  const row = orm(orchDir)
    .select({ path: agentWorktrees.path, branch: agentWorktrees.branch })
    .from(agentWorktrees)
    .where(eq(agentWorktrees.agentId, agentId))
    .get();
  return row ?? null;
}

/** Relabel an agent by its immutable id; names are intentionally non-unique. */
export function renameAgent(orchDir: string, agentId: string, name: string): boolean {
  return orm(orchDir).update(agents).set({ name }).where(eq(agents.id, agentId)).run().changes === 1;
}

export function agentById(orchDir: string, id: string): AgentRow | null {
  const row = selectAgents(orchDir).where(eq(agents.id, id)).get();
  return row ? mapAgent(row) : null;
}

export function liveAgents(orchDir: string): AgentRow[] {
  return selectAgents(orchDir).where(isNull(agentEndings.agentId)).orderBy(agents.id).all().map(mapAgent);
}

export function packMembers(orchDir: string, rootAgentId: string): AgentRow[] {
  return selectAgents(orchDir).where(eq(agents.rootAgentId, rootAgentId)).orderBy(agents.id).all().map(mapAgent);
}

export function childrenOf(orchDir: string, spawnedBy: string): AgentRow[] {
  return selectAgents(orchDir).where(eq(agents.spawnedBy, spawnedBy)).orderBy(agents.id).all().map(mapAgent);
}

/** The hello response retains its existing wire shape while its id is backed by
 * the one agent entity. An ending makes the named agent non-live. */
export function isLiveAgentIdentity(orchDir: string, value: unknown): value is SessionAgentIdentity {
  if (!isRecord(value)
    || typeof value.id !== "string" || value.id.length === 0
    || typeof value.label !== "string" || value.kind !== "session") return false;
  return liveAgentId(orchDir, eq(agents.id, value.id)) !== null;
}

/** The live agent holding an OPEN process interval for this exact instance. The
 *  pair is not an identity — it is how a harness exporting no session token is
 *  recognised across one process's life. */
function liveAgentIdByProcess(orchDir: string, pid: number, startToken: string): string | null {
  const row = orm(orchDir).select({ id: agents.id }).from(agents)
    .innerJoin(agentProcesses, and(eq(agentProcesses.agentId, agents.id), isNull(agentProcesses.until)))
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(eq(agentProcesses.pid, pid), eq(agentProcesses.startToken, startToken), isNull(agentEndings.agentId)))
    .limit(1).get();
  return row?.id ?? null;
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
export function agentIdBySessionToken(orchDir: string, sessionToken: string): string | null {
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
function liveAgentId(orchDir: string, where: SQL): string | null {
  const row = orm(orchDir).select({ id: agents.id }).from(agents)
    .leftJoin(agentEndings, eq(agentEndings.agentId, agents.id))
    .where(and(where, isNull(agentEndings.agentId))).limit(1).get();
  return row?.id ?? null;
}


/**
 * B9: record the registering session's own environment, at hello.
 *
 * `host_plexers` says which plexer is INSTALLED on a machine (E17); it does not
 * say where this agent is. The agent's own axes are satellites (A14), so they
 * are written here rather than inferred at use — what an agent can do is
 * dictated by where it is, and a fact filled in later is a fact something read
 * wrong first.
 *
 * Both are idempotent: the plexer is an immutable one-shot, and the space
 * already open is left alone rather than reopened, so a second hello from the
 * same session opens no second interval.
 */
function placeSession(orchDir: string, agentId: string, input: SessionAgentInput): void {
  const environment = environmentOf(orchDir, agentId);
  if (input.plexerId != null && environment.plexer === null) {
    setAgentPlexer(orchDir, agentId, input.plexerId);
  }
  if (input.space != null && environment.space !== input.space) {
    setSpace(orchDir, agentId, input.now, input.space);
  }
}

export function getOrCreateSessionAgent(orchDir: string, input: SessionAgentInput): SessionAgentIdentity {
  ensureHarness(orchDir, input.harnessId, input.harnessId, input.now);
  ensureHost(orchDir, input.hostId, input.hostName, input.hostOs, input.now);
  if (input.plexerId && input.plexerVersion) {
    ensurePlexer(orchDir, input.plexerId, input.plexerId);
    ensureHostPlexer(orchDir, input.hostId, input.plexerId, input.plexerVersion, input.now);
  }
  const identity = withTransaction<SessionAgentIdentity>(orchDir, () => {
    const db = orm(orchDir);
    const token = input.sessionToken ?? null;
    const existing = token === null
      ? liveAgentIdByProcess(orchDir, input.pid, input.startToken)
      : liveAgentId(orchDir, eq(agents.sessionToken, token));
    if (existing !== null) {
      db.update(agents).set({ label: input.label }).where(eq(agents.id, existing)).run();
      // The session outlives any one process instance. An agent may hold only ONE
      // open process interval (the `one_live_process` unique index), so a
      // superseded one is CLOSED before the current instance opens its own -
      // inserting beside it aborts the whole registration.
      const open = db.select({ since: agentProcesses.since, pid: agentProcesses.pid, startToken: agentProcesses.startToken })
        .from(agentProcesses).where(and(eq(agentProcesses.agentId, existing), isNull(agentProcesses.until))).get();
      if (open?.pid !== input.pid || open.startToken !== input.startToken) {
        // An agent holds ONE open process interval, and `[since, until)` are
        // half-open so they must MEET exactly: the superseded interval closes at
        // the instant the new one opens. `until > since` also forbids closing an
        // interval at its own start, which two registrations inside one
        // millisecond would otherwise do.
        let opensAt = input.now;
        if (open) {
          opensAt = Math.max(input.now, open.since + 1);
          db.update(agentProcesses).set({ until: opensAt })
            .where(and(eq(agentProcesses.agentId, existing), isNull(agentProcesses.until))).run();
        }
        db.insert(agentProcesses).values({
          agentId: existing, since: opensAt, until: null, hostId: input.hostId, pid: input.pid, startToken: input.startToken,
        }).run();
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
  // Placement runs AFTER the registration transaction: `closeThenOpen` opens its
  // own, and sqlite has no nested one. It is idempotent, so a crash in between
  // is repaired by the session's next hello rather than leaving a second row.
  placeSession(orchDir, identity.id, input);
  return identity;
}

export function ensureHarness(orchDir: string, id: string, name: string, enabledAt: number | null = null): void {
  orm(orchDir).insert(harnesses).values({ id, name, enabledAt }).onConflictDoNothing().run();
}
export function ensurePlexer(orchDir: string, id: string, name: string, enabledAt: number | null = null): void {
  orm(orchDir).insert(plexers).values({ id, name, enabledAt }).onConflictDoNothing().run();
}
export function ensureHost(orchDir: string, id: string, name: string, os: HostOs, createdAt: number): void {
  orm(orchDir).insert(hosts).values({ id, name, os, createdAt }).onConflictDoNothing().run();
}

/** Record the currently installed version for one host/plexer pair. Upgrading
 * closes the old interval before opening exactly one new row. */
export function ensureHostPlexer(orchDir: string, hostId: string, plexerId: string, version: string, since: number): void {
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
export function hostPlexers(orchDir: string, hostId?: string, plexerId?: string): HostPlexerRow[] {
  const query = orm(orchDir).select().from(hostPlexerTable);
  const rows = hostId === undefined
    ? (plexerId === undefined ? query : query.where(eq(hostPlexerTable.plexerId, plexerId)))
    : (plexerId === undefined ? query.where(eq(hostPlexerTable.hostId, hostId)) : query.where(and(eq(hostPlexerTable.hostId, hostId), eq(hostPlexerTable.plexerId, plexerId))));
  return rows.orderBy(asc(hostPlexerTable.hostId), asc(hostPlexerTable.plexerId), asc(hostPlexerTable.since)).all()
    .map((row) => ({ hostId: row.hostId, plexerId: row.plexerId, since: row.since, until: row.until, version: row.version }));
}
