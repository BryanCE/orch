import { createRequire } from "node:module";
import * as filesystem from "node:fs";
import * as path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { CORE_TABLE_DDL, STORE_SCHEMA } from "../store/schema.ts";
import type { CheckResult } from "../check-result.ts";

interface Statement {
  get(): unknown;
  all(): unknown[];
}

interface ReadOnlyDatabase {
  prepare(sql: string): Statement;
  close(): void;
}

const require = createRequire(import.meta.url);

function builtinModuleOrNull<Module>(specifier: string): Module | null {
  try {
    return require(specifier) as Module;
  } catch {
    return null;
  }
}

function openReadOnly(file: string): ReadOnlyDatabase {
  const nodeSqlite = builtinModuleOrNull<{
    DatabaseSync: new (file: string, options: { readOnly: boolean }) => DatabaseSync;
  }>("node:sqlite");
  if (nodeSqlite) {
    const database = new nodeSqlite.DatabaseSync(file, { readOnly: true });
    return {
      prepare(sql) {
        const statement = database.prepare(sql);
        return { get: () => statement.get(), all: () => statement.all() };
      },
      close: () => database.close(),
    };
  }

  const bunSqlite = builtinModuleOrNull<{
    Database: new (file: string, options: { readonly: boolean; create: boolean }) => {
      query(sql: string): Statement;
      close(): void;
    };
  }>("bun:sqlite");
  if (bunSqlite) {
    const database = new bunSqlite.Database(file, { readonly: true, create: false });
    return { prepare: (sql) => database.query(sql), close: () => database.close() };
  }
  throw new Error("this runtime provides neither node:sqlite nor bun:sqlite");
}

/** Table names come from the schema DDL, so this check cannot drift into a second list. */
function expectedTables(): string[] {
  return CORE_TABLE_DDL.flatMap((ddl) => {
    const match = /^\s*CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z_][A-Za-z0-9_]*)/i.exec(ddl);
    return match?.[1] ? [match[1]] : [];
  });
}

function property(row: unknown, key: string): unknown {
  return row !== null && typeof row === "object" ? Reflect.get(row, key) : undefined;
}

function schemaStamp(row: unknown): number | null {
  const value = property(row, "user_version");
  return typeof value === "number" && Number.isInteger(value) ? value : null;
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
    const stamp = schemaStamp(database.prepare("PRAGMA user_version").get());
    if (stamp !== STORE_SCHEMA) {
      return { id, label, status: "fail", detail: `store schema stamp ${stamp ?? "unknown"}, expected ${STORE_SCHEMA}` };
    }

    const present = new Set(
      database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(tableName).filter((name): name is string => name !== null),
    );
    const missing = expectedTables().filter((table) => !present.has(table));
    if (missing.length) {
      return { id, label, status: "fail", detail: `missing store tables: ${missing.join(", ")}` };
    }
    return { id, label, status: "ok", detail: `store schema ${STORE_SCHEMA} is healthy` };
  } catch (error: unknown) {
    return { id, label, status: "fail", detail: `cannot open orch.db: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    try { database?.close(); } catch {}
  }
}
