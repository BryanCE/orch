import { createRequire } from "node:module";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { STORE_SCHEMA, CORE_TABLE_DDL } from "./schema.ts";
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

/** Bind values crossing from orch's untyped statement port into the driver. Callers
 *  build these from row shapes the schema already fixes, so the driver rejects a
 *  genuinely unbindable value at run time rather than this cast hiding it. */
function asSqlInputs(params: readonly unknown[]): SQLInputValue[] {
  return params as SQLInputValue[];
}

class SqliteDatabaseAdapter implements DatabaseLike {
  public constructor(private readonly database: DatabaseSync) {}

  exec(sql: string): void {
    this.database.exec(sql);
  }

  close(): void {
    this.database.close();
  }

  query(sql: string): StatementLike {
    const statement = this.database.prepare(sql);
    return {
      run: (...params) => ({ changes: Number(statement.run(...asSqlInputs(params)).changes) }),
      all: (...params) => statement.all(...asSqlInputs(params)),
      get: (...params) => statement.get(...asSqlInputs(params)),
    };
  }
}

const connections = new Map<string, DatabaseLike>();

const require = createRequire(import.meta.url);

/** A built-in module this runtime provides, or null when it does not ship one. */
function builtinModuleOrNull<Module>(specifier: string): Module | null {
  try {
    return require(specifier) as Module;
  } catch {
    return null;
  }
}

/** node:sqlite is the driver everywhere it exists; bun predates it, so bun:sqlite
 *  is the guarded fallback there (CLAUDE.md Rule 6). Resolved lazily so a runtime
 *  carrying neither fails at first use, with a name, rather than at module load. */
function createDatabase(file: string): DatabaseLike {
  const nodeSqlite = builtinModuleOrNull<{ DatabaseSync: new (file: string) => DatabaseSync }>("node:sqlite");
  if (nodeSqlite) return new SqliteDatabaseAdapter(new nodeSqlite.DatabaseSync(file));
  const bunSqlite = builtinModuleOrNull<{ Database: new (file: string, options: { create: boolean }) => DatabaseLike }>("bun:sqlite");
  if (bunSqlite) return new bunSqlite.Database(file, { create: true });
  throw new Error(`cannot open ${file}: this runtime provides neither node:sqlite nor bun:sqlite`);
}

function databasePath(orchDir: string): string {
  return join(orchDir, "orch.db");
}

function createTables(db: DatabaseLike): void {
  for (const ddl of CORE_TABLE_DDL) db.exec(ddl);
}

/** True once any table exists — a file this open just created has none, and an
 *  unstamped empty file is new, not stale. */
function storeIsPopulated(db: DatabaseLike): boolean {
  return db.query("SELECT name FROM sqlite_master WHERE type = 'table' LIMIT 1").get() != null;
}

function storeSchemaOf(db: DatabaseLike): number {
  const row = db.query("PRAGMA user_version").get() as { user_version?: number } | null;
  return row?.user_version ?? 0;
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

/**
 * Reap a store written against a different shape and hand back an empty one.
 *
 * `CREATE TABLE IF NOT EXISTS` cannot add a column, so a store from an older
 * shape survives every open and then rejects each insert against the new
 * columns — which spawned panes that no row ever described. Pre-publish there
 * is exactly one shape (Rule 8): the old file is malformed data, not a version
 * to migrate.
 */
function recreateStore(db: DatabaseLike, path: string): DatabaseLike {
  db.close();
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`${path}${suffix}`, { force: true });
  process.stderr.write(`orch: ${path} was written against an older store shape - recreated empty\n`);
  return createDatabase(path);
}

/** Open (create-if-absent) the WAL store for one orch dir; connection is cached. */
export function openStore(orchDir: string): DatabaseLike {
  const path = databasePath(orchDir);
  const cached = connections.get(path);
  if (cached) return cached;
  mkdirSync(orchDir, { recursive: true });
  let db = createDatabase(path);
  db.exec("PRAGMA foreign_keys = ON;");
  let fresh = !storeIsPopulated(db);
  if (!fresh) {
    const foundSchema = storeSchemaOf(db);
    if (foundSchema !== STORE_SCHEMA) {
      const livePresence = hasLivePresence(orchDir);
      const slave = process.env.ORCH_AGENT_KEY !== undefined;
      if (livePresence) {
        db.close();
        throw new Error(`orch: refusing schema mismatch (schema skew: stamp ${foundSchema}, expected ${STORE_SCHEMA}) while live presence exists; stop agents before rebuild/reinstall`);
      }
      if (slave) {
        db.close();
        throw new Error(`orch: slave cannot recreate schema mismatch (schema skew: stamp ${foundSchema}, expected ${STORE_SCHEMA}); rebuild/reinstall orch from the pack orch or user`);
      }
      db = recreateStore(db, path);
      db.exec("PRAGMA foreign_keys = ON;");
      fresh = true;
    }
  }
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  // The DDL is not idempotent and must never replay onto a live current-schema
  // store: a reopen runs NO DDL at all. Only a new or just-reaped file is built.
  if (fresh) {
    createTables(db);
    db.exec(`PRAGMA user_version = ${STORE_SCHEMA}`);
  }
  connections.set(path, db);
  return db;
}

/** Close every cached connection; tests call this before removing their temp dirs. */
export function closeAllStores(): void {
  for (const [path, db] of connections) {
    // bun's node:sqlite keeps a WAL-mode database file locked on Windows past
    // close() (oven-sh/bun#25964); leaving WAL first releases the mapping so
    // the file is deletable the moment close returns.
    try { db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;"); } catch {}
    db.close();
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
