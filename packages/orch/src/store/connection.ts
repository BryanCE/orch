import type { OrchDir } from "../types/core.ts";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { setImmediate } from "node:timers";
import { defineRelations, sql } from "drizzle-orm";
import { drizzle, type NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import * as tables from "../db/schema.ts";
import { launchCredential } from "../identity/launch.ts";
import { recordedInstanceIsLive } from "../process-identity.ts";
import { ensurePrivateDir, errorMessage, isRecord, packageRoot } from "../util.ts";

/** One open file: the drizzle handle every caller queries through, beside the
 *  driver it was built on. The driver is reached for exactly two things drizzle
 *  does not own — connection pragmas and closing the file. */
interface OpenDatabase {
  readonly client: DatabaseSync;
  readonly orm: Orm;
}

/** drizzle 1.x types its handle by a relations object rather than the bare
 *  table module. Every table is registered here with no relations between them:
 *  the store queries tables directly, so the relational query builder stays
 *  unused, but the handle still names exactly orch's tables. */
const relations = defineRelations(tables);
export type Orm = NodeSQLiteDatabase<typeof relations>;

const connections = new Map<OrchDir, OpenDatabase>();

type RowWrite = (db: Orm) => void;

const writeQueues = new Map<OrchDir, RowWrite[]>();
const scheduledDrains = new Set<OrchDir>();
const openTransactions = new Map<OrchDir, number>();

let writeFailureReporter: (error: unknown) => void = (error) => {
  console.error("orch: a queued store write failed", error);
};

export function reportWriteFailures(report: (error: unknown) => void): void {
  writeFailureReporter = report;
}

/** One drain of one dir's write queue, as it landed. */
export interface DrainRecord {
  readonly rows: number;
  readonly batched: boolean;
  readonly elapsedMs: number;
}

let drainReporter: (drain: DrainRecord) => void = () => undefined;

export function reportDrains(report: (drain: DrainRecord) => void): void {
  drainReporter = report;
}

/** `node:sqlite` is a builtin in node and bun alike: no compiled addon to
 *  mismatch a platform, and none for bun's N-API layer to panic on
 *  (oven-sh/bun#24956). */
function createDatabase(file: string, readOnly = false): OpenDatabase {
  const client = readOnly ? new DatabaseSync(file, { readOnly: true }) : new DatabaseSync(file);
  return { client, orm: drizzle({ client, relations }) };
}

interface LiveProcessRow {
  readonly agent_id: string;
  readonly pid: number;
  readonly start_token: string | null;
  readonly spawned_by: string | null;
}

function isLiveProcessRow(value: unknown): value is LiveProcessRow {
  if (!isRecord(value)) return false;
  const agentId = value.agent_id;
  const pid = value.pid;
  const startToken = value.start_token;
  const spawnedBy = value.spawned_by;
  return typeof agentId === "string" && typeof pid === "number"
    && (typeof startToken === "string" || startToken === null)
    && (typeof spawnedBy === "string" || spawnedBy === null);
}

/**
 * Who is live in this store, split by what losing the store costs them.
 *
 * A worker's identity is the launch credential orch handed it; the row is the
 * only thing that credential resolves to, so a rebuild orphans it. A driving
 * session resolves itself through its harness session token and re-registers
 * on its next command, so a rebuild costs it a fresh id and nothing else.
 */
export interface LiveHolders {
  readonly workers: readonly string[];
  readonly sessions: readonly string[];
}

function describeHolders(kind: string, ids: readonly string[]): string {
  return `${ids.length} ${kind}${ids.length === 1 ? " is" : "s are"} live: ${ids.join(", ")}`;
}

function databasePath(orchDir: OrchDir): string {
  return join(orchDir, "orch.db");
}

/** The generated migrations, shipped beside the package. Resolved from the
 *  package root rather than this file's own location: the extension bundles are
 *  symlinked into each harness's extension directory, and a walk relative to the
 *  link lands beside the harness (`~/.pi/drizzle`), not beside the package. */
function migrationsFolder(): string {
  return join(packageRoot(), "drizzle");
}

/** Store process rows are the liveness source; read raw because the store may be refused. */
export function livePresenceHolders(orchDir: OrchDir): LiveHolders {
  let opened: OpenDatabase | undefined;
  try {
    opened = createDatabase(databasePath(orchDir), true);
    const rows = opened.client.prepare(
      "SELECT p.agent_id, p.pid, p.start_token, a.spawned_by FROM agent_processes p JOIN agents a ON a.id = p.agent_id WHERE p.until IS NULL",
    ).all();
    const workers: string[] = [];
    const sessions: string[] = [];
    for (const row of rows) {
      if (!isLiveProcessRow(row) || !recordedInstanceIsLive(row.pid, row.start_token)) continue;
      (row.spawned_by === null ? sessions : workers).push(row.agent_id);
    }
    return { workers, sessions };
  } catch {
    return { workers: [], sessions: [] };
  } finally {
    try { opened?.client.close(); } catch {}
  }
}

/**
 * True when orch launched this process with a credential.
 *
 * This is the store's own guard, so it cannot ask `callerKind()`: that answers
 * from the claim row, which lives in the store this guard protects (the call
 * would recurse `orm → callerKind → agentById → orm`). Presence of the launch
 * credential is enough here — a spawned agent, claimed or not, never rebuilds
 * the store — and it is read through the one leaf that owns the env var.
 */
function callerIsSpawnedAgent(): boolean {
  return launchCredential() !== null;
}

/**
 * Refuse destructive store maintenance that is not the caller's to perform.
 *
 * Rebuilding the store deletes the only record of who every agent is, so it is
 * the user's or the pack orch's call and never a slave's — and while any worker
 * is live it is nobody's, because a living worker's identity is never collateral.
 * A live driving session is different: it re-registers on its next command, so
 * the user may rebuild under one by saying so (`withSessions`).
 *
 * 2026-08-27: a slave running dev-tree code stamped the live store one schema
 * ahead, and the installed CLI silently reaped and recreated it under twelve
 * live agents.
 */
export function assertStoreRecreatable(orchDir: OrchDir, options: { withSessions: boolean } = { withSessions: false }): void {
  const file = databasePath(orchDir);
  if (callerIsSpawnedAgent()) {
    throw new Error(`orch: a spawned agent never rebuilds ${file}. Report the skew to the user or the pack's orch, who rebuilds it, and change nothing.`);
  }
  const holders = livePresenceHolders(orchDir);
  if (holders.workers.length > 0) {
    throw new Error(`orch: refusing to rebuild ${file} while ${describeHolders("worker", holders.workers)}. `
      + `Their identity exists only in this store; close them first ('orch close --all'), then retry.`);
  }
  if (holders.sessions.length > 0 && !options.withSessions) {
    throw new Error(`orch: refusing to rebuild ${file} while ${describeHolders("driving session", holders.sessions)}. `
      + `A session re-registers on its next command, so pass --with-sessions to rebuild under them, or close them first.`);
  }
}

/** A store carrying orch's tables with no record of the migrations that create
 *  them: every file written before orch adopted drizzle looks like this. Asked
 *  first because drizzle's migrator writes `__drizzle_migrations` before it
 *  reaches the collision, and a refused open must leave the file untouched. */
function predatesMigrations(db: Orm): boolean {
  const anyTable = db.get(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1`);
  if (anyTable === undefined) return false;
  return db.get(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`) === undefined;
}

/**
 * Bring the file up to the migrations shipped with this orch, creating it when
 * absent. drizzle records what it applied in `__drizzle_migrations`, so a store
 * already at the newest migration runs no DDL at all.
 *
 * A store predating migrations is not repairable from here — it is backed up and
 * rebuilt by `bun db:reset`.
 */
/** drizzle refuses a migration folder written by an older drizzle-kit. The folder
 *  is the stale half, not the store, so rebuilding the store cannot fix it and
 *  only costs the data — every rebuild meets the same refusal. */
function migrationFolderPredatesKit(reason: string): boolean {
  return reason.includes("drizzle-kit up");
}

/** What the caller who hit this skew may actually do about it. A slave is told
 *  to report it, never how to rebuild: naming a rebuild at a process that must
 *  not run one is how the store got recreated under twelve live agents. */
function openRemedy(orchDir: OrchDir, reason: string): string {
  if (callerIsSpawnedAgent()) {
    return "A spawned agent never rebuilds the store: report this skew to the user or the pack's orch, and change nothing.";
  }
  if (migrationFolderPredatesKit(reason)) {
    return "Regenerate the migration folder with 'bun db:gen'; rebuilding the store will not help.";
  }
  return `Rebuild it with 'bun db:reset', which first keeps a copy under ${join(orchDir, "backups")}.`;
}

function applyMigrations(opened: OpenDatabase, path: string, orchDir: OrchDir): void {
  try {
    if (predatesMigrations(opened.orm)) throw new Error("it has orch's tables but no record of the migrations that create them");
    migrate(opened.orm, { migrationsFolder: migrationsFolder() });
  } catch (error) {
    opened.client.close();
    const reason = errorMessage(error);
    const holders = livePresenceHolders(orchDir);
    const live = holders.workers.length > 0 || holders.sessions.length > 0 ? " Live agents hold this store; close them first." : "";
    throw new Error(`orch: ${path} does not match orch's migrations (${reason}).${live} ${openRemedy(orchDir, reason)}`);
  }
}

/** The raw drizzle handle for one orch dir. */
function rawOrm(orchDir: OrchDir): Orm {
  return openDatabase(orchDir).orm;
}

/** Queue a row write for the next event-loop turn, unless already inside a batch. */
export function queueWrite(orchDir: OrchDir, write: RowWrite): void {
  if ((openTransactions.get(orchDir) ?? 0) > 0) {
    write(rawOrm(orchDir));
    return;
  }
  const queue = writeQueues.get(orchDir) ?? [];
  queue.push(write);
  writeQueues.set(orchDir, queue);
  if (scheduledDrains.has(orchDir)) return;
  scheduledDrains.add(orchDir);
  setImmediate(() => {
    scheduledDrains.delete(orchDir);
    drainWrites(orchDir);
  });
}

/** Try to land all queued writes in one transaction. */
function drainAsBatch(orchDir: OrchDir, writes: readonly RowWrite[]): boolean {
  try {
    withTransaction(orchDir, () => {
      const db = rawOrm(orchDir);
      for (const write of writes) write(db);
    });
    return true;
  } catch {
    return false;
  }
}

/** Retry a failed batch one write at a time, reporting and dropping failures. */
function drainOneByOne(orchDir: OrchDir, writes: readonly RowWrite[]): void {
  for (const write of writes) {
    try {
      withTransaction(orchDir, () => write(rawOrm(orchDir)));
    } catch (error) {
      writeFailureReporter(error);
    }
  }
}

/** Drain this dir's queued writes, preserving independent writes after a failure. */
export function drainWrites(orchDir: OrchDir): void {
  const queued = writeQueues.get(orchDir);
  if (queued === undefined || queued.length === 0) return;
  const startedAt = performance.now();
  writeQueues.set(orchDir, []);
  if (drainAsBatch(orchDir, queued)) {
    drainReporter({ rows: queued.length, batched: true, elapsedMs: performance.now() - startedAt });
    return;
  }
  drainOneByOne(orchDir, queued);
  drainReporter({ rows: queued.length, batched: false, elapsedMs: performance.now() - startedAt });
}

/** The typed drizzle handle for one orch dir: the ONE query stack over the one
 *  connection. Opening creates the file when absent and applies every migration;
 *  the connection is cached per orch dir. Every read drains pending writes. */
export function orm(orchDir: OrchDir): Orm {
  drainWrites(orchDir);
  return rawOrm(orchDir);
}

const memoResets = new Set<() => void>();

export function registerMemoReset(reset: () => void): void {
  memoResets.add(reset);
}

/**
 * Whether this orch dir has a store yet.
 *
 * `setup`, `doctor`, `help`, `version` and
 * `status --offline` need no identity BECAUSE THEY NEVER WRITE. Opening the
 * store is a write — `orm` creates the file and applies every migration
 * into it — so a read path that calls it unconditionally turns `orch status
 * --offline` on a machine that has never run orch into a machine that has.
 */
export function storeExists(orchDir: OrchDir): boolean {
  return connections.has(orchDir) || writeQueues.has(orchDir) || existsSync(databasePath(orchDir));
}

/** The store for reading, or `null` where there is none. Never creates one. */
export function ormForRead(orchDir: OrchDir): Orm | null {
  return storeExists(orchDir) ? orm(orchDir) : null;
}

function openDatabase(orchDir: OrchDir): OpenDatabase {
  const path = databasePath(orchDir);
  const cached = connections.get(orchDir);
  if (cached) return cached;
  ensurePrivateDir(orchDir);
  const opened = createDatabase(path);
  const db = opened.client;
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  // Both pragmas above are connection state and write nothing. Journal mode is
  // written into the file, so it comes after the guard: an open orch refuses
  // must leave the store byte-identical.
  applyMigrations(opened, path, orchDir);
  db.exec("PRAGMA journal_mode = WAL;");
  // Under WAL, NORMAL syncs the log at checkpoint instead of at every commit. A
  // crash of orch loses nothing; only power loss can drop the last commits. FULL
  // was an fsync per status report.
  db.exec("PRAGMA synchronous = NORMAL;");
  connections.set(orchDir, opened);
  return opened;
}

/** Close every cached connection; tests call this before removing their temp dirs. */
export function closeAllStores(): void {
  const directories = new Set<OrchDir>([...connections.keys(), ...writeQueues.keys()]);
  for (const orchDir of directories) drainWrites(orchDir);
  for (const [orchDir, opened] of connections) {
    // A WAL-mode database file can stay locked on Windows past close(); leaving
    // WAL first releases the mapping so the file is deletable the moment close
    // returns, which is what lets a test remove its temp dir.
    // Two statements, two execs: the checkpoint fails outright while any
    // statement the migrator prepared is still open, and running both in one
    // exec let that failure skip the journal-mode reset — which is what left a
    // `-wal` sidecar beside a store orch had promised not to touch.
    try { opened.client.exec("PRAGMA wal_checkpoint(TRUNCATE);"); } catch {}
    try { opened.client.exec("PRAGMA journal_mode = DELETE;"); } catch {}
    opened.client.close();
    connections.delete(orchDir);
  }
  writeQueues.clear();
  scheduledDrains.clear();
  openTransactions.clear();
  for (const reset of memoResets) reset();
}

/** How many transactions are open on each connection, so a nested call becomes a
 *  savepoint inside the outer one instead of a second BEGIN sqlite refuses. */
interface TransactionVerbs { readonly begin: string; readonly commit: string; readonly rollback: string }

function transactionVerbs(depth: number): TransactionVerbs {
  if (depth === 0) return { begin: "BEGIN IMMEDIATE", commit: "COMMIT", rollback: "ROLLBACK" };
  const savepoint = `nested_${depth}`;
  return { begin: `SAVEPOINT ${savepoint}`, commit: `RELEASE ${savepoint}`, rollback: `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` };
}

/** One immediate transaction around `body`, on the same cached connection every
 *  store module writes through. drizzle's own `transaction` takes a callback
 *  bound to a scoped handle; orch's writers reach the connection by orch dir, so
 *  the boundary is stated here in the driver's own terms. A call inside another
 *  is a savepoint, so a writer composed of writers commits or rolls back as one. */
export function withTransaction<T>(orchDir: OrchDir, body: () => T): T {
  const db = openDatabase(orchDir).client;
  const depth = openTransactions.get(orchDir) ?? 0;
  const verbs = transactionVerbs(depth);
  db.exec(verbs.begin);
  openTransactions.set(orchDir, depth + 1);
  try {
    const result = body();
    db.exec(verbs.commit);
    return result;
  } catch (error) {
    try { db.exec(verbs.rollback); } catch {}
    throw error;
  } finally {
    openTransactions.set(orchDir, depth);
  }
}
