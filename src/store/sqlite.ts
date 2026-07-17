import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { TaskOptions, TaskRec, TaskState } from "../queue.ts";
import type { SpawnedRecord } from "../store.ts";

// One SQLite file per $ORCH_DIR holds the queue, ownership registry, delivery
// outbox, and spawn registry. jsonl remains the human-visible truth channel for
// presence/results/transitions; only this internal state lives here.

interface StatementLike {
  run(...params: unknown[]): { changes: number };
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
}

interface DatabaseLike {
  exec(sql: string): void;
  query(sql: string): StatementLike;
  close(): void;
}

interface NodeStatement {
  run(...params: unknown[]): { changes: number | bigint };
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
}

interface NodeDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
  close(): void;
}

class NodeDatabaseAdapter implements DatabaseLike {
  public constructor(private readonly database: NodeDatabase) {}

  exec(sql: string): void {
    this.database.exec(sql);
  }

  close(): void {
    this.database.close();
  }

  query(sql: string): StatementLike {
    const statement = this.database.prepare(sql);
    return {
      run: (...params) => ({ changes: Number(statement.run(...params).changes) }),
      all: (...params) => statement.all(...params),
      get: (...params) => statement.get(...params),
    };
  }
}

const connections = new Map<string, DatabaseLike>();

const bunSqlite = process.versions.bun
  ? await import("bun:sqlite") as unknown as {
      Database: new (path: string, options: { create: boolean }) => DatabaseLike;
    }
  : null;
const require = createRequire(import.meta.url);

function createDatabase(path: string): DatabaseLike {
  if (bunSqlite) return new bunSqlite.Database(path, { create: true });
  const nodeSqlite = require("node:sqlite") as {
    DatabaseSync: new (path: string) => NodeDatabase;
  };
  return new NodeDatabaseAdapter(new nodeSqlite.DatabaseSync(path));
}

function databasePath(orchDir: string): string {
  return join(orchDir, "orch.db");
}

function createTables(db: DatabaseLike): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      opts TEXT NOT NULL,
      origin_workspace TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      state TEXT NOT NULL,
      retries INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      agent_key TEXT,
      result TEXT
    );
    CREATE TABLE IF NOT EXISTS ownership (
      agent_key TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      workspace TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      target TEXT NOT NULL,
      payload TEXT NOT NULL,
      state TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      next_attempt_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS spawned (
      pane TEXT PRIMARY KEY,
      ts TEXT,
      adapter TEXT,
      model TEXT,
      backend TEXT,
      workspace TEXT,
      handle TEXT,
      cwd TEXT,
      worktree TEXT,
      branch TEXT
    );
  `);

  // Keep migrations additive for databases created by earlier versions.
  addColumnIfMissing(db, "outbox", "next_attempt_at", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "spawned", "workspace", "TEXT");
  addColumnIfMissing(db, "spawned", "handle", "TEXT");
  addColumnIfMissing(db, "spawned", "cwd", "TEXT");
}

/** Apply an additive column migration, tolerating a concurrent applier's race. */
function addColumnIfMissing(db: DatabaseLike, table: string, column: string, definition: string): void {
  const columns = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((existing) => existing.name === column)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (error: unknown) {
    if (!(error instanceof Error) || !/duplicate column name/i.test(error.message)) throw error;
  }
}

/** Open (create-if-absent) the WAL store for one orch dir; connection is cached. */
function openStore(orchDir: string): DatabaseLike {
  const path = databasePath(orchDir);
  const cached = connections.get(path);
  if (cached) return cached;
  mkdirSync(orchDir, { recursive: true });
  const db = createDatabase(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  createTables(db);
  connections.set(path, db);
  return db;
}

/** Close every cached connection; tests call this before removing their temp dirs. */
export function closeAllStores(): void {
  for (const [path, db] of connections) {
    db.close();
    connections.delete(path);
  }
}

interface QueueRow {
  id: string;
  text: string;
  opts: string;
  origin_workspace: string | null;
  created_at: string;
  updated_at: string;
  state: string;
  retries: number;
  last_error: string | null;
  agent_key: string | null;
  result: string | null;
}

function rowToTask(row: QueueRow): TaskRec {
  const task: TaskRec = {
    id: row.id,
    text: row.text,
    opts: JSON.parse(row.opts) as TaskOptions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    state: row.state as TaskState,
    retries: row.retries,
  };
  if (row.origin_workspace !== null) task.workspace = row.origin_workspace;
  if (row.last_error !== null) task.lastError = row.last_error;
  if (row.agent_key !== null) task.agentKey = row.agent_key;
  if (row.result !== null) task.result = JSON.parse(row.result) as unknown;
  return task;
}

export function insertQueueTask(orchDir: string, task: TaskRec): void {
  openStore(orchDir)
    .query(
      `INSERT INTO queue (id, text, opts, origin_workspace, created_at, updated_at, state, retries)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      task.id,
      task.text,
      JSON.stringify(task.opts),
      task.workspace ?? null,
      task.createdAt,
      task.updatedAt,
      task.state,
      task.retries,
    );
}

export function selectQueueTasks(orchDir: string): TaskRec[] {
  const rows = openStore(orchDir).query("SELECT * FROM queue ORDER BY created_at ASC").all() as QueueRow[];
  return rows.map(rowToTask);
}

/** Record which orchestrator controls an agent, replacing any prior owner. */
export function setOwner(orchDir: string, agentKey: string, owner: string): void {
  const updatedAt = new Date().toISOString();
  openStore(orchDir)
    .query(
      `INSERT INTO ownership (agent_key, owner, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(agent_key) DO UPDATE SET owner = excluded.owner, updated_at = excluded.updated_at`,
    )
    .run(agentKey, owner, updatedAt);
}

export function getOwner(orchDir: string, agentKey: string): string | undefined {
  const row = openStore(orchDir)
    .query("SELECT owner FROM ownership WHERE agent_key = ?")
    .get(agentKey) as { owner: string } | null;
  return row?.owner;
}

export type OwnerWriteResult =
  | { ok: true; reassigned?: boolean }
  | { ok: false; reason: string };

/** Check ownership synchronously and optionally transfer control to the actor. */
export function checkOwnerWrite(
  orchDir: string,
  agentKey: string,
  actor: string,
  opts: { steal?: boolean } = {},
): OwnerWriteResult {
  const owner = getOwner(orchDir, agentKey);
  if (owner === undefined || owner === actor) return { ok: true };
  if (!opts.steal) return { ok: false, reason: `agent is owned by ${owner}` };
  const changes = openStore(orchDir)
    .query("UPDATE ownership SET owner = ?, updated_at = ? WHERE agent_key = ? AND owner = ?")
    .run(actor, new Date().toISOString(), agentKey, owner).changes;
  if (changes === 1) return { ok: true, reassigned: true };
  const current = getOwner(orchDir, agentKey);
  return { ok: false, reason: `agent is owned by ${current ?? owner}` };
}

export function selectQueueTask(orchDir: string, id: string): TaskRec | undefined {
  const row = openStore(orchDir).query("SELECT * FROM queue WHERE id = ?").get(id) as QueueRow | null;
  return row ? rowToTask(row) : undefined;
}

/** Atomic queued->claimed transition; true only for the single winning caller. */
export function writeTaskClaim(orchDir: string, id: string, agentKey: string, ts: string): boolean {
  const changes = openStore(orchDir)
    .query("UPDATE queue SET state = 'claimed', agent_key = ?, updated_at = ? WHERE id = ? AND state = 'queued'")
    .run(agentKey, ts, id).changes;
  return changes === 1;
}

export function writeTaskDone(orchDir: string, id: string, ts: string, result: unknown): void {
  openStore(orchDir)
    .query("UPDATE queue SET state = 'done', result = ?, updated_at = ? WHERE id = ? AND state = 'claimed'")
    .run(result === undefined ? null : JSON.stringify(result), ts, id);
}

export function writeTaskFailure(orchDir: string, id: string, ts: string, error: string): void {
  openStore(orchDir)
    .query("UPDATE queue SET state = 'failed', last_error = ?, updated_at = ? WHERE id = ? AND state = 'claimed'")
    .run(error, ts, id);
}

export function writeTaskRequeue(orchDir: string, id: string, ts: string, error?: string): void {
  const db = openStore(orchDir);
  if (error === undefined) {
    db.query(
      "UPDATE queue SET state = 'queued', retries = retries + 1, updated_at = ? WHERE id = ? AND state IN ('claimed', 'failed')",
    ).run(ts, id);
    return;
  }
  db.query(
    "UPDATE queue SET state = 'queued', retries = retries + 1, last_error = ?, updated_at = ? WHERE id = ? AND state IN ('claimed', 'failed')",
  ).run(error, ts, id);
}

export function writeTaskCancel(orchDir: string, id: string, ts: string): void {
  openStore(orchDir)
    .query("UPDATE queue SET state = 'cancelled', updated_at = ? WHERE id = ? AND state = 'queued'")
    .run(ts, id);
}

interface SpawnedRow {
  pane: string;
  ts: string | null;
  adapter: string | null;
  model: string | null;
  backend: string | null;
  workspace: string | null;
  handle: string | null;
  cwd: string | null;
  worktree: string | null;
  branch: string | null;
}

function rowToSpawned(row: SpawnedRow): SpawnedRecord {
  const record: SpawnedRecord = { pane: row.pane };
  if (row.ts !== null) record.ts = row.ts;
  if (row.adapter !== null) record.adapter = row.adapter;
  if (row.model !== null) record.model = row.model;
  if (row.backend !== null) record.backend = row.backend;
  if (row.workspace !== null) record.workspace = row.workspace;
  if (row.handle !== null) record.handle = row.handle;
  if (row.cwd !== null) record.cwd = row.cwd;
  if (row.worktree !== null) record.worktree = row.worktree;
  if (row.branch !== null) record.branch = row.branch;
  return record;
}

/** Upsert by pane: a later spawn of the same pane replaces the earlier record. */
export function insertSpawnedRecord(orchDir: string, record: SpawnedRecord): void {
  openStore(orchDir)
    .query(
      `INSERT INTO spawned (pane, ts, adapter, model, backend, workspace, handle, cwd, worktree, branch)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(pane) DO UPDATE SET
         ts = excluded.ts, adapter = excluded.adapter, model = excluded.model,
         backend = excluded.backend, workspace = excluded.workspace, handle = excluded.handle, cwd = excluded.cwd,
         worktree = excluded.worktree, branch = excluded.branch`,
    )
    .run(
      record.pane,
      record.ts ?? null,
      record.adapter ?? null,
      record.model ?? null,
      record.backend ?? null,
      record.workspace ?? null,
      record.handle ?? null,
      record.cwd ?? null,
      record.worktree ?? null,
      record.branch ?? null,
    );
}

export function selectSpawnedRecords(orchDir: string): SpawnedRecord[] {
  const rows = openStore(orchDir).query("SELECT * FROM spawned").all() as SpawnedRow[];
  return rows.map(rowToSpawned);
}

export interface OutboxMessageInput {
  id: string;
  target: string;
  payload: unknown;
  createdAt?: string;
}

export interface OutboxMessage {
  id: string;
  target: string;
  payload: unknown;
  state: "pending" | "delivered";
  attempts: number;
  createdAt: string;
  nextAttemptAt: number;
}

interface OutboxRow {
  id: string;
  target: string;
  payload: string;
  state: string;
  attempts: number;
  created_at: string;
  next_attempt_at: number;
}

function rowToOutboxMessage(row: OutboxRow): OutboxMessage {
  return {
    id: row.id,
    target: row.target,
    payload: JSON.parse(row.payload) as unknown,
    state: row.state as OutboxMessage["state"],
    attempts: row.attempts,
    createdAt: row.created_at,
    nextAttemptAt: row.next_attempt_at,
  };
}

/** Insert a pending message; synchronous so callers may use it in a transaction. */
export function insertOutboxMessage(orchDir: string, msg: OutboxMessageInput): void {
  const createdAt = msg.createdAt ?? new Date().toISOString();
  openStore(orchDir)
    .query(
      `INSERT INTO outbox (id, target, payload, state, attempts, created_at, updated_at, next_attempt_at)
       VALUES (?, ?, ?, 'pending', 0, ?, ?, 0)`,
    )
    .run(msg.id, msg.target, JSON.stringify(msg.payload), createdAt, createdAt);
}

export function selectPendingOutbox(orchDir: string, now: number): OutboxMessage[] {
  const rows = openStore(orchDir)
    .query(
      "SELECT id, target, payload, state, attempts, created_at, next_attempt_at FROM outbox WHERE state = 'pending' AND next_attempt_at <= ? ORDER BY created_at ASC",
    )
    .all(now) as OutboxRow[];
  return rows.map(rowToOutboxMessage);
}

export function markOutboxDelivered(orchDir: string, id: string): void {
  openStore(orchDir)
    .query("UPDATE outbox SET state = 'delivered' WHERE id = ? AND state = 'pending'")
    .run(id);
}

export function bumpOutboxAttempt(orchDir: string, id: string, nextAttemptAt: number): void {
  openStore(orchDir)
    .query(
      "UPDATE outbox SET attempts = attempts + 1, next_attempt_at = ? WHERE id = ? AND state = 'pending'",
    )
    .run(nextAttemptAt, id);
}
