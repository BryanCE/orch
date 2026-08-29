import { existsSync, readdirSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { join } from "node:path";
import { defineRelations } from "drizzle-orm";
import { drizzle, type NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import * as tables from "../db/schema.ts";
import { presenceRoot, readStatus } from "../presence/writer.ts";
import { ensurePrivateDir, pidAlive } from "../util.ts";
import type { DatabaseLike, StatementLike } from "../types/store.ts";

/** SQLite stores five kinds of value, and every caller of this port builds its
 *  arguments from a row shape the schema already fixes. Anything else is a bug
 *  worth naming here rather than a value to hand the driver and hope. */
function bindValue(value: unknown): SQLInputValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
  if (value instanceof Uint8Array) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  throw new TypeError(`cannot bind ${typeof value} to a SQLite parameter`);
}

class NodeSqliteAdapter implements DatabaseLike {
  public constructor(private readonly database: DatabaseSync) {}

  exec(sql: string): void {
    this.database.exec(sql);
  }

  close(): void {
    this.database.close();
  }

  query(sql: string): StatementLike {
    const statement = this.database.prepare(sql);
    const bound = (params: readonly unknown[]) => params.map(bindValue);
    return {
      run: (...params) => ({ changes: Number(statement.run(...bound(params)).changes) }),
      all: (...params) => statement.all(...bound(params)),
      // A row that is not there is absent, and absence is null here as it is in
      // every column: one answer for "no row", never a second empty value a
      // caller has to remember to test for separately.
      get: (...params) => statement.get(...bound(params)) ?? null,
    };
  }
}

/** One open file, in both the shapes callers need: the untyped statement port
 *  the store was written against, and the drizzle handle replacing it. Both
 *  address the same connection, so a half-converted module stays consistent. */
interface OpenDatabase {
  readonly port: DatabaseLike;
  readonly orm: Orm;
}

/** drizzle 1.x types its handle by a relations object rather than the bare
 *  table module. Every table is registered here with no relations between them:
 *  the store queries tables directly, so the relational query builder stays
 *  unused, but the handle still names exactly orch's tables. */
const relations = defineRelations(tables);
type Orm = NodeSQLiteDatabase<typeof relations>;

const connections = new Map<string, OpenDatabase>();

/** One driver under both the raw port and drizzle, so a half-converted module
 *  stays consistent. `node:sqlite` is a builtin in node and bun alike: no
 *  compiled addon to mismatch a platform, and none for bun's N-API layer to
 *  panic on (oven-sh/bun#24956). */
function createDatabase(file: string): OpenDatabase {
  const client = new DatabaseSync(file);
  return { port: new NodeSqliteAdapter(client), orm: drizzle({ client, relations }) };
}

function databasePath(orchDir: string): string {
  return join(orchDir, "orch.db");
}

/** The generated migrations, shipped beside the package. Both bundles orch runs
 *  from — `dist/bin/orch.js` and `dist/daemon/orchd.js` — sit two levels under the
 *  package root, which is also where this file sits under the checkout. */
function migrationsFolder(): string {
  return join(import.meta.dirname, "..", "..", "drizzle");
}

/** Every agent whose status record still names a live pid. A current-schema
 *  record with a live pid means an agent is still running, and its identity is
 *  written nowhere but this store: recreating under it erases a living agent. */
export function livePresenceHolders(orchDir: string): string[] {
  let entries: { name: string; isDirectory(): boolean }[];
  try {
    entries = readdirSync(presenceRoot(orchDir), { withFileTypes: true });
  } catch {
    return [];
  }
  const live: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const status = readStatus(join(presenceRoot(orchDir), entry.name));
      if (pidAlive(status.pid)) live.push(entry.name);
    } catch {
      // A malformed status is not a live presence record.
    }
  }
  return live;
}

/**
 * True when orch launched this process as an agent: it was handed the launch key
 * at spawn, and a user's shell never carries one.
 *
 * Only the key's PRESENCE is asked, never its shape — the identity codec lives in
 * `backends/identity.ts`, which reaches this module through the presence store,
 * so parsing here would be both a second parser and an import cycle.
 */
function callerIsSpawnedAgent(): boolean {
  return (process.env.ORCH_AGENT_KEY ?? "").length > 0;
}

/**
 * Refuse destructive store maintenance that is not the caller's to perform.
 *
 * Rebuilding the store deletes the only record of who every agent is, so it is
 * the user's or the pack orch's call and never a slave's — and while any agent
 * is live it is nobody's, because a living agent's identity is never collateral.
 *
 * 2026-08-27: a slave running dev-tree code stamped the live store one schema
 * ahead, and the installed CLI silently reaped and recreated it under twelve
 * live agents.
 */
export function assertStoreRecreatable(orchDir: string): void {
  const file = databasePath(orchDir);
  if (callerIsSpawnedAgent()) {
    throw new Error(`orch: a spawned agent never rebuilds ${file}. Report the skew to the user or the pack's orch, who rebuilds it, and change nothing.`);
  }
  const holders = livePresenceHolders(orchDir);
  if (holders.length > 0) {
    throw new Error(`orch: refusing to rebuild ${file} while ${holders.length} agent${holders.length === 1 ? " is" : "s are"} live: ${holders.join(", ")}. `
      + `Their identity exists only in this store; close them first ('orch close --all'), then retry.`);
  }
}

/** A store carrying orch's tables with no record of the migrations that create
 *  them: every file written before orch adopted drizzle looks like this. Asked
 *  first because drizzle's migrator writes `__drizzle_migrations` before it
 *  reaches the collision, and a refused open must leave the file untouched. */
function predatesMigrations(db: DatabaseLike): boolean {
  const anyTable = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1").get();
  if (anyTable == null) return false;
  return db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'").get() == null;
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
function openRemedy(orchDir: string, reason: string): string {
  if (callerIsSpawnedAgent()) {
    return "A spawned agent never rebuilds the store: report this skew to the user or the pack's orch, and change nothing.";
  }
  if (migrationFolderPredatesKit(reason)) {
    return "Regenerate the migration folder with 'bun db:gen'; rebuilding the store will not help.";
  }
  return `Rebuild it with 'bun db:reset', which first keeps a copy under ${join(orchDir, "backups")}.`;
}

function applyMigrations(opened: OpenDatabase, path: string, orchDir: string): void {
  try {
    if (predatesMigrations(opened.port)) throw new Error("it has orch's tables but no record of the migrations that create them");
    migrate(opened.orm, { migrationsFolder: migrationsFolder() });
  } catch (error) {
    opened.port.close();
    const reason = error instanceof Error ? error.message : String(error);
    const live = livePresenceHolders(orchDir).length > 0 ? " Live agents hold this store; close them first." : "";
    throw new Error(`orch: ${path} does not match orch's migrations (${reason}).${live} ${openRemedy(orchDir, reason)}`);
  }
}

/** The typed drizzle handle for one orch dir, opened and verified exactly as
 *  {@link openStore} does — they share the connection cache and the one file. */
export function orm(orchDir: string): Orm {
  return openDatabase(orchDir).orm;
}

/** Open (create-if-absent) the WAL store for one orch dir; connection is cached. */
export function openStore(orchDir: string): DatabaseLike {
  return openDatabase(orchDir).port;
}

/**
 * Whether this orch dir has a store yet.
 *
 * TASKS/02-scope.md B6: `setup`, `doctor`, `help`, `version` and
 * `status --offline` need no identity BECAUSE THEY NEVER WRITE. Opening the
 * store is a write — `openStore` creates the file and applies every migration
 * into it — so a read path that calls it unconditionally turns `orch status
 * --offline` on a machine that has never run orch into a machine that has.
 */
export function storeExists(orchDir: string): boolean {
  return connections.has(databasePath(orchDir)) || existsSync(databasePath(orchDir));
}

/** The store for reading, or `null` where there is none. Never creates one. */
export function ormForRead(orchDir: string): Orm | null {
  return storeExists(orchDir) ? orm(orchDir) : null;
}

function openDatabase(orchDir: string): OpenDatabase {
  const path = databasePath(orchDir);
  const cached = connections.get(path);
  if (cached) return cached;
  ensurePrivateDir(orchDir);
  const opened = createDatabase(path);
  const db = opened.port;
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  // Both pragmas above are connection state and write nothing. Journal mode is
  // written into the file, so it comes after the guard: an open orch refuses
  // must leave the store byte-identical.
  applyMigrations(opened, path, orchDir);
  db.exec("PRAGMA journal_mode = WAL;");
  connections.set(path, opened);
  return opened;
}

/** Close every cached connection; tests call this before removing their temp dirs. */
export function closeAllStores(): void {
  for (const [path, opened] of connections) {
    // A WAL-mode database file can stay locked on Windows past close(); leaving
    // WAL first releases the mapping so the file is deletable the moment close
    // returns, which is what lets a test remove its temp dir.
    // Two statements, two execs: the checkpoint fails outright while any
    // statement the migrator prepared is still open, and running both in one
    // exec let that failure skip the journal-mode reset — which is what left a
    // `-wal` sidecar beside a store orch had promised not to touch.
    try { opened.port.exec("PRAGMA wal_checkpoint(TRUNCATE);"); } catch {}
    try { opened.port.exec("PRAGMA journal_mode = DELETE;"); } catch {}
    opened.port.close();
    connections.delete(path);
  }
}

export function transaction<T>(db: DatabaseLike, body: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = body();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch {}
    throw error;
  }
}

export function withTransaction<T>(orchDir: string, body: () => T): T {
  return transaction(openStore(orchDir), body);
}
