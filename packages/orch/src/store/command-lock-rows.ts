import type { OrchDir } from "../types/core.ts";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { orm, withTransaction } from "./connection.ts";
import { commandLocks } from "../db/schema.ts";

export type CommandLockRow = typeof commandLocks.$inferSelect;

/** The held rows for these patterns, whoever holds them. */
export function selectCommandLocks(orchDir: OrchDir, patterns: readonly string[]): CommandLockRow[] {
  if (patterns.length === 0) return [];
  return orm(orchDir).select().from(commandLocks).where(inArray(commandLocks.pattern, [...patterns])).all();
}

/** Take every pattern at once, replacing rows whose holder is gone. */
export function takeCommandLocks(orchDir: OrchDir, rows: readonly CommandLockRow[], stale: readonly string[]): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    if (stale.length) db.delete(commandLocks).where(inArray(commandLocks.pattern, [...stale])).run();
    if (rows.length) db.insert(commandLocks).values([...rows]).run();
  });
}

/** Drop every pattern one `orch lock` process instance holds. */
export function releaseCommandLocks(orchDir: OrchDir, pid: number, startToken: string | null): void {
  const token = startToken === null ? isNull(commandLocks.startToken) : eq(commandLocks.startToken, startToken);
  orm(orchDir).delete(commandLocks).where(and(eq(commandLocks.pid, pid), token)).run();
}
