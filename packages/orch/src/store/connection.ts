import { existsSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { defineRelations, sql } from "drizzle-orm";
import { drizzle, type NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import * as tables from "../db/schema.ts";
import { presenceRoot, readStatus } from "../presence/writer.ts";
import { launchCredential } from "../identity/launch.ts";
import { ensurePrivateDir, errorMessage, pidAlive } from "../util.ts";

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

const connections = new Map<string, OpenDatabase>();

/** `node:sqlite` is a builtin in node and bun alike: no compiled addon to
 *  mismatch a platform, and none for bun's N-API layer to panic on
 *  (oven-sh/bun#24956). */
function createDatabase(file: string): OpenDatabase {
  const client = new DatabaseSync(file);
  return { client, orm: drizzle({ client, relations }) };
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
    if (predatesMigrations(opened.orm)) throw new Error("it has orch's tables but no record of the migrations that create them");
    migrate(opened.orm, { migrationsFolder: migrationsFolder() });
  } catch (error) {
    opened.client.close();
    const reason = errorMessage(error);
    const live = livePresenceHolders(orchDir).length > 0 ? " Live agents hold this store; close them first." : "";
    throw new Error(`orch: ${path} does not match orch's migrations (${reason}).${live} ${openRemedy(orchDir, reason)}`);
  }
}

/** The typed drizzle handle for one orch dir: the ONE query stack over the one
 *  connection. Opening creates the file when absent and applies every migration;
 *  the connection is cached per orch dir. */
export function orm(orchDir: string): Orm {
  return openDatabase(orchDir).orm;
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
  const db = opened.client;
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
    try { opened.client.exec("PRAGMA wal_checkpoint(TRUNCATE);"); } catch {}
    try { opened.client.exec("PRAGMA journal_mode = DELETE;"); } catch {}
    opened.client.close();
    connections.delete(path);
  }
}

/** One immediate transaction around `body`, on the same cached connection every
 *  store module writes through. drizzle's own `transaction` takes a callback
 *  bound to a scoped handle; orch's writers reach the connection by orch dir, so
 *  the boundary is stated here in the driver's own terms. */
export function withTransaction<T>(orchDir: string, body: () => T): T {
  const db = openDatabase(orchDir).client;
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
