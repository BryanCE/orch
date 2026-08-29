import type { SQL } from "drizzle-orm";
import type { Orm } from "../../src/store/connection.ts";

/**
 * The one row a raw query matched, or `undefined` where it matched none.
 *
 * drizzle's `get` types its result as the caller's type argument and gives no
 * usable default, so reading a row it has no table type for means asserting a
 * shape the query never proved. `all(...)[0]` returns the same row as `unknown`
 * — the honest type for a raw SELECT — and says "no row" the way an absent
 * array element already does.
 */
export function row(db: Orm, query: SQL): unknown {
  return db.all(query)[0];
}

/** One string column of a raw row, or a named failure. */
export function stringField(value: unknown, column: string): string {
  if (isRow(value) && typeof value[column] === "string") return value[column];
  throw new Error(`row carries no string '${column}'`);
}

/** One numeric column of a raw row, or a named failure. */
export function numberField(value: unknown, column: string): number {
  if (isRow(value) && typeof value[column] === "number") return value[column];
  throw new Error(`row carries no number '${column}'`);
}

function isRow(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
