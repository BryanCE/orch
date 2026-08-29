import * as filesystem from "node:fs";
import * as path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { is } from "drizzle-orm";
import { SQLiteTable, getTableConfig } from "drizzle-orm/sqlite-core";
import * as tables from "../db/schema.ts";
import type { CheckResult } from "../check-result.ts";
import { errorMessage } from "../util.ts";

/** drizzle records what it has applied here; a store built before orch adopted
 *  migrations has the tables and no record of them. */
const MIGRATIONS_TABLE = "__drizzle_migrations";

interface Statement {
  get(): unknown;
  all(): unknown[];
}

interface ReadOnlyDatabase {
  prepare(sql: string): Statement;
  close(): void;
}

/** Doctor reads the store without opening it for writes: a check must never be
 *  the thing that creates or migrates a file it is reporting on. */
function openReadOnly(file: string): ReadOnlyDatabase {
  const database = new DatabaseSync(file, { readOnly: true });
  return {
    prepare(sql) {
      const statement = database.prepare(sql);
      return { get: () => statement.get(), all: () => statement.all() };
    },
    close: () => database.close(),
  };
}

/** Table names come from the drizzle declarations the migrations are generated
 *  from, so this check cannot drift into a second list. Views are declared there
 *  too and are not tables, so only tables are counted. */
function expectedTables(): string[] {
  const declared: readonly unknown[] = Object.values(tables);
  return declared.filter((value) => is(value, SQLiteTable)).map((table) => getTableConfig(table).name);
}

function property(row: unknown, key: string): unknown {
  return row !== null && typeof row === "object" ? Reflect.get(row, key) : undefined;
}

function appliedCount(row: unknown): number {
  const value = property(row, "applied");
  return typeof value === "number" ? value : 0;
}

function tableName(row: unknown): string | null {
  const value = property(row, "name");
  return typeof value === "string" ? value : null;
}

export function checkStore(orchDir: string): CheckResult {
  const id = "store";
  const label = "Store";
  const file = path.join(orchDir, "orch.db");
  if (!filesystem.existsSync(file)) {
    return { id, label, status: "warn", detail: "orch.db is absent" };
  }

  let database: ReadOnlyDatabase | undefined;
  try {
    database = openReadOnly(file);
    const present = new Set(
      database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(tableName).filter((name): name is string => name !== null),
    );
    if (!present.has(MIGRATIONS_TABLE)) {
      return { id, label, status: "fail", detail: `orch.db predates orch's migrations; rebuild it with 'bun db:reset', which keeps a copy first` };
    }
    const missing = expectedTables().filter((table) => !present.has(table));
    if (missing.length) {
      return { id, label, status: "fail", detail: `missing store tables: ${missing.join(", ")}` };
    }
    const applied = appliedCount(database.prepare(`SELECT COUNT(*) AS applied FROM ${MIGRATIONS_TABLE}`).get());
    return { id, label, status: "ok", detail: `store healthy at ${applied} applied migration${applied === 1 ? "" : "s"}` };
  } catch (error: unknown) {
    return { id, label, status: "fail", detail: `cannot open orch.db: ${errorMessage(error)}` };
  } finally {
    try { database?.close(); } catch {}
  }
}
