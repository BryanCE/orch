import { and, asc, eq, isNull } from "drizzle-orm";
import { mintAgentId } from "../backends/identity.ts";
import { isRecord } from "../util.ts";
import { openStore, orm, withTransaction } from "./connection.ts";
import { agentEndings, agentWorktrees, agents, hostPlexers as hostPlexerTable } from "../db/schema.ts";
import { environmentOf } from "./agent-view.ts";
import { setAgentPlexer, setSpace } from "./interval-rows.ts";

export type HostOs = "linux" | "windows" | "darwin";

/** This machine's OS as the store names it. Throws rather than guess: an
 *  unsupported platform is a host orch cannot record, not a host it may mislabel. */
export function currentHostOs(): HostOs {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "linux") return "linux";
  throw new Error(`unsupported host OS ${process.platform}`);
}

export interface AgentInput {
  id: string;
  spawnedBy?: string | null;
  harnessId: string;
  cwd: string;
  name: string;
  label?: string | null;
  createdAt: number;
}

export interface AgentEnding { endedAt: number; closedBy: string | null }
export interface SessionAgentIdentity {
  readonly id: string;
  readonly label: string;
  readonly kind: "session";
}
export interface SessionAgentInput {
  pid: number;
  startToken: string;
  /** The harness's own stable session token, when it exports one. It, not the
   *  process pair, is what keeps ONE session on ONE agent id for its whole life. */
  sessionToken?: string | null;
  harnessId: string;
  cwd: string;
  label: string;
  hostId: string;
  hostName: string;
  hostOs: HostOs;
  /** Plexer observed by the registering session, when it runs in one. */
  plexerId?: string | null;
  plexerVersion?: string | null;
  /** The space the caller registered in. Optional (A7): a session in no space
   *  records no row, which is an answer and not a missing value. */
  space?: string | null;
  now: number;
}
export interface AgentRow {
  id: string;
  spawnedBy: string | null;
  rootAgentId: string;
  harnessId: string;
  cwd: string;
  name: string;
  label: string | null;
  createdAt: number;
  ending?: AgentEnding | null;
}

export interface AgentWorktree {
  path: string;
  branch: string;
}

export interface HostPlexerRow {
  hostId: string;
  plexerId: string;
  since: number;
  until: number | null;
  version: string;
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
    label: agent.label, createdAt: agent.createdAt,
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
    cwd: input.cwd, name: input.name, label: input.label ?? null, createdAt: input.createdAt,
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
  return openStore(orchDir).query(
    `SELECT a.id FROM agents a LEFT JOIN agent_endings e ON e.agent_id = a.id
     WHERE a.id = ? AND e.agent_id IS NULL`,
  ).get(value.id) != null;
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
  const row = openStore(orchDir).query(
    `SELECT a.id FROM agents a
     LEFT JOIN agent_endings e ON e.agent_id = a.id
     WHERE a.session_token = ? AND e.agent_id IS NULL
     LIMIT 1`,
  ).get(sessionToken);
  return isAgentIdRow(row) ? row.id : null;
}

function isProcessRow(value: unknown): value is { since: number; pid: number; start_token: string | null } {
  return isRecord(value) && typeof value.pid === "number" && typeof value.since === "number"
    && (value.start_token === null || typeof value.start_token === "string");
}

function isAgentIdRow(value: unknown): value is { id: string } {
  return isRecord(value) && typeof value.id === "string";
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
    const db = openStore(orchDir);
    const token = input.sessionToken ?? null;
    const existing = token === null
      ? db.query(
        `SELECT a.id FROM agents a
         JOIN agent_processes p ON p.agent_id = a.id AND p.until IS NULL
         LEFT JOIN agent_endings e ON e.agent_id = a.id
         WHERE p.pid = ? AND p.start_token = ? AND e.agent_id IS NULL
         LIMIT 1`,
      ).get(input.pid, input.startToken)
      : db.query(
        `SELECT a.id FROM agents a
         LEFT JOIN agent_endings e ON e.agent_id = a.id
         WHERE a.session_token = ? AND e.agent_id IS NULL
         LIMIT 1`,
      ).get(token);
    if (isAgentIdRow(existing)) {
      db.query("UPDATE agents SET label = ? WHERE id = ?").run(input.label, existing.id);
      // The session outlives any one process instance. An agent may hold only ONE
      // open process interval (the `one_live_process` unique index), so a
      // superseded one is CLOSED before the current instance opens its own -
      // inserting beside it aborts the whole registration.
      const open = db.query(
        "SELECT since, pid, start_token FROM agent_processes WHERE agent_id = ? AND until IS NULL",
      ).get(existing.id);
      const current = isProcessRow(open) && open.pid === input.pid && open.start_token === input.startToken;
      if (!current) {
        // An agent holds ONE open process interval, and `[since, until)` are
        // half-open so they must MEET exactly: the superseded interval closes at
        // the instant the new one opens. `until > since` also forbids closing an
        // interval at its own start, which two registrations inside one
        // millisecond would otherwise do.
        let opensAt = input.now;
        if (isProcessRow(open)) {
          opensAt = Math.max(input.now, open.since + 1);
          db.query("UPDATE agent_processes SET until = ? WHERE agent_id = ? AND until IS NULL")
            .run(opensAt, existing.id);
        }
        db.query(
          `INSERT INTO agent_processes (agent_id, since, until, host_id, pid, start_token)
           VALUES (?, ?, NULL, ?, ?, ?)`,
        ).run(existing.id, opensAt, input.hostId, input.pid, input.startToken);
      }
      return { id: existing.id, label: input.label, kind: "session" };
    }

    const id = mintAgentId();
    const name = `${input.harnessId}-${id.slice(0, 8)}`;
    db.query(
      `INSERT INTO agents (id, spawned_by, root_agent_id, harness_id, cwd, name, label, session_token, created_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, id, input.harnessId, input.cwd, name, input.label, token, input.now);
    db.query(
      `INSERT INTO agent_processes (agent_id, since, until, host_id, pid, start_token)
       VALUES (?, ?, NULL, ?, ?, ?)`,
    ).run(id, input.now, input.hostId, input.pid, input.startToken);
    return { id, label: input.label, kind: "session" };
  });
  // Placement runs AFTER the registration transaction: `closeThenOpen` opens its
  // own, and sqlite has no nested one. It is idempotent, so a crash in between
  // is repaired by the session's next hello rather than leaving a second row.
  placeSession(orchDir, identity.id, input);
  return identity;
}

export function ensureHarness(orchDir: string, id: string, name: string, enabledAt: number | null = null): void {
  openStore(orchDir).query("INSERT OR IGNORE INTO harnesses (id, name, enabled_at) VALUES (?, ?, ?)").run(id, name, enabledAt);
}
export function ensurePlexer(orchDir: string, id: string, name: string, enabledAt: number | null = null): void {
  openStore(orchDir).query("INSERT OR IGNORE INTO plexers (id, name, enabled_at) VALUES (?, ?, ?)").run(id, name, enabledAt);
}
export function ensureHost(orchDir: string, id: string, name: string, os: HostOs, createdAt: number): void {
  openStore(orchDir).query("INSERT OR IGNORE INTO hosts (id, name, os, created_at) VALUES (?, ?, ?, ?)").run(id, name, os, createdAt);
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
