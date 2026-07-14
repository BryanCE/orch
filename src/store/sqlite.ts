import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { TaskOptions, TaskRec, TaskState } from "../queue.ts";
import type { SpawnedRecord } from "../store.ts";

// One SQLite file per $ORCH_DIR holds the queue, ownership registry, delivery
// outbox, and spawn registry. jsonl remains the human-visible truth channel for
// presence/results/transitions; only this internal state lives here.

const connections = new Map<string, Database>();

function databasePath(orchDir: string): string {
  return join(orchDir, "orch.db");
}

function createTables(db: Database): void {
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
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS spawned (
      pane TEXT PRIMARY KEY,
      ts TEXT,
      adapter TEXT,
      model TEXT,
      backend TEXT,
      worktree TEXT,
      branch TEXT
    );
  `);
}

/** Open (create-if-absent) the WAL store for one orch dir; connection is cached. */
export function openStore(orchDir: string): Database {
  const path = databasePath(orchDir);
  const cached = connections.get(path);
  if (cached) return cached;
  mkdirSync(orchDir, { recursive: true });
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  createTables(db);
  connections.set(path, db);
  return db;
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
  worktree: string | null;
  branch: string | null;
}

function rowToSpawned(row: SpawnedRow): SpawnedRecord {
  const record: SpawnedRecord = { pane: row.pane };
  if (row.ts !== null) record.ts = row.ts;
  if (row.adapter !== null) record.adapter = row.adapter;
  if (row.model !== null) record.model = row.model;
  if (row.backend !== null) record.backend = row.backend;
  if (row.worktree !== null) record.worktree = row.worktree;
  if (row.branch !== null) record.branch = row.branch;
  return record;
}

/** Upsert by pane: a later spawn of the same pane replaces the earlier record. */
export function insertSpawnedRecord(orchDir: string, record: SpawnedRecord): void {
  openStore(orchDir)
    .query(
      `INSERT INTO spawned (pane, ts, adapter, model, backend, worktree, branch)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(pane) DO UPDATE SET
         ts = excluded.ts, adapter = excluded.adapter, model = excluded.model,
         backend = excluded.backend, worktree = excluded.worktree, branch = excluded.branch`,
    )
    .run(
      record.pane,
      record.ts ?? null,
      record.adapter ?? null,
      record.model ?? null,
      record.backend ?? null,
      record.worktree ?? null,
      record.branch ?? null,
    );
}

export function selectSpawnedRecords(orchDir: string): SpawnedRecord[] {
  const rows = openStore(orchDir).query("SELECT * FROM spawned").all() as SpawnedRow[];
  return rows.map(rowToSpawned);
}

export interface OwnershipRecord {
  agentKey: string;
  owner: string;
  workspace: string | null;
  updatedAt: string;
}

/** Record (or reassign) the orchestrator that controls an agent. */
export function writeOwner(orchDir: string, agentKey: string, owner: string, workspace: string | null, ts: string): void {
  openStore(orchDir)
    .query(
      `INSERT INTO ownership (agent_key, owner, workspace, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(agent_key) DO UPDATE SET
         owner = excluded.owner, workspace = excluded.workspace, updated_at = excluded.updated_at`,
    )
    .run(agentKey, owner, workspace, ts);
}

export function readOwner(orchDir: string, agentKey: string): OwnershipRecord | undefined {
  const row = openStore(orchDir)
    .query("SELECT agent_key, owner, workspace, updated_at FROM ownership WHERE agent_key = ?")
    .get(agentKey) as { agent_key: string; owner: string; workspace: string | null; updated_at: string } | null;
  return row
    ? { agentKey: row.agent_key, owner: row.owner, workspace: row.workspace, updatedAt: row.updated_at }
    : undefined;
}

export function clearOwner(orchDir: string, agentKey: string): void {
  openStore(orchDir).query("DELETE FROM ownership WHERE agent_key = ?").run(agentKey);
}

export type OutboxState = "pending" | "delivered";

export interface OutboxMessage {
  id: string;
  target: string;
  payload: string;
  state: OutboxState;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

interface OutboxRow {
  id: string;
  target: string;
  payload: string;
  state: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}

function rowToOutbox(row: OutboxRow): OutboxMessage {
  return {
    id: row.id,
    target: row.target,
    payload: row.payload,
    state: row.state as OutboxState,
    attempts: row.attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Durably accept a message before delivery; the id also stamps the inbox record. */
export function insertOutboxMessage(orchDir: string, id: string, target: string, payload: string, ts: string): void {
  openStore(orchDir)
    .query(
      `INSERT INTO outbox (id, target, payload, state, attempts, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', 0, ?, ?)`,
    )
    .run(id, target, payload, ts, ts);
}

/** Mark delivered on ack; idempotent so a retried-then-acked message applies once. */
export function markOutboxDelivered(orchDir: string, id: string, ts: string): void {
  openStore(orchDir)
    .query("UPDATE outbox SET state = 'delivered', updated_at = ? WHERE id = ? AND state = 'pending'")
    .run(ts, id);
}

export function bumpOutboxAttempt(orchDir: string, id: string, ts: string): void {
  openStore(orchDir)
    .query("UPDATE outbox SET attempts = attempts + 1, updated_at = ? WHERE id = ?")
    .run(ts, id);
}

/** Undelivered messages, oldest first — the retry/restart-resume work list. */
export function pendingOutboxMessages(orchDir: string): OutboxMessage[] {
  const rows = openStore(orchDir)
    .query("SELECT * FROM outbox WHERE state = 'pending' ORDER BY created_at ASC")
    .all() as OutboxRow[];
  return rows.map(rowToOutbox);
}
