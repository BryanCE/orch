import { eq, isNull } from "drizzle-orm";
import { mintAgentId } from "../backends/identity.ts";
import { isRecord } from "../util.ts";
import { openStore, orm, withTransaction } from "./connection.ts";
import { agentEndings, agentWorktrees, agents } from "./tables.ts";

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
  harnessId: string;
  cwd: string;
  label: string;
  hostId: string;
  hostName: string;
  hostOs: HostOs;
  /** Plexer observed by the registering session, when it runs in one. */
  plexerId?: string | null;
  plexerVersion?: string | null;
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

/** Register a caller as an agent, using its open process instance as continuity.
 * Pids are never identities: only the (pid,start_token) pair finds an existing id. */
export function getOrCreateSessionAgent(orchDir: string, input: SessionAgentInput): SessionAgentIdentity {
  ensureHarness(orchDir, input.harnessId, input.harnessId, input.now);
  ensureHost(orchDir, input.hostId, input.hostName, input.hostOs, input.now);
  if (input.plexerId && input.plexerVersion) {
    ensurePlexer(orchDir, input.plexerId, input.plexerId);
    ensureHostPlexer(orchDir, input.hostId, input.plexerId, input.plexerVersion, input.now);
  }
  return withTransaction(orchDir, () => {
    const db = openStore(orchDir);
    const existing = db.query(
      `SELECT a.id FROM agents a
       JOIN agent_processes p ON p.agent_id = a.id AND p.until IS NULL
       LEFT JOIN agent_endings e ON e.agent_id = a.id
       WHERE p.pid = ? AND p.start_token = ? AND e.agent_id IS NULL
       LIMIT 1`,
    ).get(input.pid, input.startToken) as { id: string } | undefined;
    if (existing) {
      db.query("UPDATE agents SET label = ? WHERE id = ?").run(input.label, existing.id);
      return { id: existing.id, label: input.label, kind: "session" };
    }

    const id = mintAgentId();
    const name = `${input.harnessId}-${id.slice(0, 8)}`;
    db.query(
      `INSERT INTO agents (id, spawned_by, root_agent_id, harness_id, cwd, name, label, created_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
    ).run(id, id, input.harnessId, input.cwd, name, input.label, input.now);
    db.query(
      `INSERT INTO agent_processes (agent_id, since, until, host_id, pid, start_token)
       VALUES (?, ?, NULL, ?, ?, ?)`,
    ).run(id, input.now, input.hostId, input.pid, input.startToken);
    return { id, label: input.label, kind: "session" };
  });
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
    const db = openStore(orchDir);
    const current = db.query(
      "SELECT since, version FROM host_plexers WHERE host_id = ? AND plexer_id = ? AND until IS NULL",
    ).get(hostId, plexerId) as { since: number; version: string } | undefined;
    if (current?.version === normalized) return;
    const at = current ? Math.max(since, current.since + 1) : since;
    if (current) db.query("UPDATE host_plexers SET until = ? WHERE host_id = ? AND plexer_id = ? AND until IS NULL").run(at, hostId, plexerId);
    db.query("INSERT INTO host_plexers (host_id, plexer_id, since, until, version) VALUES (?, ?, ?, NULL, ?)").run(hostId, plexerId, at, normalized);
  });
}

/** Read host plexer history, or only the current open row when requested. */
export function hostPlexers(orchDir: string, hostId?: string, plexerId?: string): HostPlexerRow[] {
  const clauses: string[] = [];
  const args: string[] = [];
  if (hostId !== undefined) { clauses.push("host_id = ?"); args.push(hostId); }
  if (plexerId !== undefined) { clauses.push("plexer_id = ?"); args.push(plexerId); }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const rows = openStore(orchDir).query(`SELECT host_id, plexer_id, since, until, version FROM host_plexers${where} ORDER BY host_id, plexer_id, since`).all(...args) as { host_id: string; plexer_id: string; since: number; until: number | null; version: string }[];
  return rows.map((row) => ({ hostId: row.host_id, plexerId: row.plexer_id, since: row.since, until: row.until, version: row.version }));
}
