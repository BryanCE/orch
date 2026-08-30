import { join } from "node:path";
import { sql } from "drizzle-orm";
import { closeAllStores, orm } from "../../src/store/connection.ts";
import { isRecord } from "../../src/util.ts";

// Build a store up to the migrations in `drizzle/` and describe what it holds.
// Opening it is what migrates it: `orm` runs the same `applyMigrations` an
// installed orch runs on its first command, so a dev store and a published one
// can never come up differently.

interface ObjectCount {
  readonly type: string;
  readonly count: number;
}

interface StoreSummary {
  readonly applied: number;
  readonly objects: readonly ObjectCount[];
}

const PLURALS: Record<string, string> = { table: "tables", index: "indexes", view: "views", trigger: "triggers" };

/** The store port answers in `unknown`, so each column is checked rather than
 *  asserted: a shape this script got wrong should say so, not print a number
 *  that came from nowhere. */
function countOf(row: unknown, column: string): number {
  if (isRecord(row) && typeof row[column] === "number") return row[column];
  throw new Error(`store query returned no numeric '${column}'`);
}

function objectCountsOf(rows: readonly unknown[]): ObjectCount[] {
  return rows.flatMap((row) => (isRecord(row) && typeof row.type === "string" ? [{ type: row.type, count: countOf(row, "count") }] : []));
}

export function buildStore(storeDir: string): StoreSummary {
  const store = orm(storeDir);
  const applied = countOf(store.all(sql`SELECT COUNT(*) AS applied FROM __drizzle_migrations`)[0], "applied");
  const objects = objectCountsOf(store.all(sql`SELECT type, COUNT(*) AS count FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' GROUP BY type ORDER BY type`));
  closeAllStores();
  return { applied, objects };
}

export function reportStore(command: string, storeDir: string, summary: StoreSummary): void {
  process.stdout.write(`\n${command}  ${join(storeDir, "orch.db")}\n`);
  process.stdout.write(`  ${summary.applied} migration${summary.applied === 1 ? "" : "s"} applied\n`);
  for (const { type, count } of summary.objects) {
    process.stdout.write(`  ${String(count).padStart(3)} ${count === 1 ? type : PLURALS[type] ?? `${type}s`}\n`);
  }
  process.stdout.write("\n");
}
