import { mintAgentId } from "../backends/identity.ts";
import { isRecord } from "../util.ts";
import { openStore, withTransaction } from "./connection.ts";

export type HostOs = "linux" | "windows" | "darwin";

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

interface RawAgent {
  id: string; spawned_by: string | null; root_agent_id: string; harness_id: string;
  cwd: string; name: string; label: string | null; created_at: number;
  ended_at?: number | null; closed_by?: string | null;
}

function mapAgent(row: RawAgent): AgentRow {
  const result: AgentRow = {
    id: row.id, spawnedBy: row.spawned_by, rootAgentId: row.root_agent_id,
    harnessId: row.harness_id, cwd: row.cwd, name: row.name,
    label: row.label, createdAt: row.created_at,
  };
  if ("ended_at" in row) result.ending = row.ended_at == null ? null : { endedAt: row.ended_at, closedBy: row.closed_by ?? null };
  return result;
}

const SELECT = `SELECT a.id, a.spawned_by, a.root_agent_id, a.harness_id, a.cwd, a.name, a.label, a.created_at,
  e.ended_at, e.closed_by FROM agents a LEFT JOIN agent_endings e ON e.agent_id = a.id`;

export function insertAgent(orchDir: string, input: AgentInput): AgentRow {
  const db = openStore(orchDir);
  const spawnedBy = input.spawnedBy ?? null;
  let root = input.id;
  if (spawnedBy !== null) {
    const parent = db.query("SELECT root_agent_id FROM agents WHERE id = ?").get(spawnedBy) as { root_agent_id?: string } | undefined;
    if (!parent) throw new Error(`unknown spawner: ${spawnedBy}`);
    root = parent.root_agent_id!;
  }
  db.query(`INSERT INTO agents (id, spawned_by, root_agent_id, harness_id, cwd, name, label, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(input.id, spawnedBy, root, input.harnessId, input.cwd, input.name, input.label ?? null, input.createdAt);
  return { id: input.id, spawnedBy, rootAgentId: root, harnessId: input.harnessId, cwd: input.cwd, name: input.name, label: input.label ?? null, createdAt: input.createdAt, ending: null };
}

export function endAgent(orchDir: string, agentId: string, endedAt: number, closedBy: string | null): void {
  openStore(orchDir).query("INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES (?, ?, ?)").run(agentId, endedAt, closedBy);
}

/** Record that an agent runs from a git worktree. No row means the repo itself. */
export function setWorktree(orchDir: string, agentId: string, path: string, branch: string): void {
  openStore(orchDir).query(
    `INSERT INTO agent_worktrees (agent_id, path, branch) VALUES (?, ?, ?)
     ON CONFLICT(agent_id) DO UPDATE SET path = excluded.path, branch = excluded.branch`,
  ).run(agentId, path, branch);
}

export function worktreeOf(orchDir: string, agentId: string): AgentWorktree | null {
  const row = openStore(orchDir).query("SELECT path, branch FROM agent_worktrees WHERE agent_id = ?").get(agentId) as AgentWorktree | undefined;
  return row ?? null;
}

/** Relabel an agent by its immutable id; names are intentionally non-unique. */
export function renameAgent(orchDir: string, agentId: string, name: string): boolean {
  return openStore(orchDir).query("UPDATE agents SET name = ? WHERE id = ?").run(name, agentId).changes === 1;
}

export function agentById(orchDir: string, id: string): AgentRow | null {
  const row = openStore(orchDir).query(`${SELECT} WHERE a.id = ?`).get(id) as RawAgent | undefined;
  return row ? mapAgent(row) : null;
}

export function liveAgents(orchDir: string): AgentRow[] {
  const rows = openStore(orchDir).query(`${SELECT} WHERE e.agent_id IS NULL ORDER BY a.id`).all() as RawAgent[];
  return rows.map(mapAgent);
}

export function packMembers(orchDir: string, rootAgentId: string): AgentRow[] {
  const rows = openStore(orchDir).query(`${SELECT} WHERE a.root_agent_id = ? ORDER BY a.id`).all(rootAgentId) as RawAgent[];
  return rows.map(mapAgent);
}

export function childrenOf(orchDir: string, spawnedBy: string): AgentRow[] {
  const rows = openStore(orchDir).query(`${SELECT} WHERE a.spawned_by = ? ORDER BY a.id`).all(spawnedBy) as RawAgent[];
  return rows.map(mapAgent);
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
