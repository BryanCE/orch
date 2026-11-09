import type { OrchDir } from "../types/core.ts";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { orm, withTransaction } from "./connection.ts";
import { commandLocks } from "../db/schema.ts";
import type { HostedProcess } from "../types/process.ts";

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
export function releaseCommandLocks(orchDir: OrchDir, process: HostedProcess): void {
  const token = process.startToken === null ? isNull(commandLocks.startToken) : eq(commandLocks.startToken, process.startToken);
  orm(orchDir).delete(commandLocks).where(and(eq(commandLocks.hostId, process.host), eq(commandLocks.pid, process.pid), token)).run();
}

/** The `orch lock` process instance holding a row, on the host it runs on. */
export function lockHolder(row: CommandLockRow): HostedProcess {
  return { host: row.hostId, pid: row.pid, startToken: row.startToken };
}
