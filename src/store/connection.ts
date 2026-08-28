import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { join } from "node:path";
import { drizzle, type NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import * as tables from "./tables.ts";
import { PRESENCE_SCHEMA, STATUS_FILE } from "../presence/schema.ts";
import { presenceRoot } from "../presence/writer.ts";
import { pidAlive } from "../util.ts";

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
  readonly orm: NodeSQLiteDatabase<typeof tables>;
}

const connections = new Map<string, OpenDatabase>();

/** One driver under both the raw port and drizzle, so a half-converted module
 *  stays consistent. `node:sqlite` is a builtin in node and bun alike: no
 *  compiled addon to mismatch a platform, and none for bun's N-API layer to
 *  panic on (oven-sh/bun#24956). */
function createDatabase(file: string): OpenDatabase {
  const client = new DatabaseSync(file);
  return { port: new NodeSqliteAdapter(client), orm: drizzle({ client, schema: tables }) };
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

/** A current-schema status record with a live pid means an agent is still
 * running. Recreating the store while one exists would erase its identity. */
function hasLivePresence(orchDir: string): boolean {
  let entries: { name: string; isDirectory(): boolean }[];
  try {
    entries = readdirSync(presenceRoot(orchDir), { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const status = JSON.parse(readFileSync(join(presenceRoot(orchDir), entry.name, STATUS_FILE), "utf8")) as { schema?: unknown; pid?: unknown };
      if (status?.schema === PRESENCE_SCHEMA && pidAlive(status.pid)) return true;
    } catch {
      // A malformed status is not a live presence record.
    }
  }
  return false;
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

function applyMigrations(opened: OpenDatabase, path: string, orchDir: string): void {
  try {
    if (predatesMigrations(opened.port)) throw new Error("it has orch's tables but no record of the migrations that create them");
    migrate(opened.orm, { migrationsFolder: migrationsFolder() });
  } catch (error) {
    opened.port.close();
    const reason = error instanceof Error ? error.message : String(error);
    const live = hasLivePresence(orchDir) ? " Live agents hold this store; close them first." : "";
    const remedy = migrationFolderPredatesKit(reason)
      ? "Regenerate the migration folder with 'bun db:gen'; rebuilding the store will not help."
      : `Rebuild it with 'bun db:reset', which first keeps a copy under ${join(orchDir, "backups")}.`;
    throw new Error(`orch: ${path} does not match orch's migrations (${reason}).${live} ${remedy}`);
  }
}

/** The typed drizzle handle for one orch dir, opened and verified exactly as
 *  {@link openStore} does — they share the connection cache and the one file. */
export function orm(orchDir: string): NodeSQLiteDatabase<typeof tables> {
  return openDatabase(orchDir).orm;
}

/** Open (create-if-absent) the WAL store for one orch dir; connection is cached. */
export function openStore(orchDir: string): DatabaseLike {
  return openDatabase(orchDir).port;
}

function openDatabase(orchDir: string): OpenDatabase {
  const path = databasePath(orchDir);
  const cached = connections.get(path);
  if (cached) return cached;
  mkdirSync(orchDir, { recursive: true });
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
    try { opened.port.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;"); } catch {}
    opened.port.close();
    connections.delete(path);
  }
}

export function withTransaction<T>(orchDir: string, body: () => T): T {
  const db = openStore(orchDir);
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
