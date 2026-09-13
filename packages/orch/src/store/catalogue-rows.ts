import type { OrchDir } from "../types/core.ts";
import { asc } from "drizzle-orm";
import { orm } from "./connection.ts";
import { catalogues } from "../db/schema.ts";
import type { StoredCatalogue } from "../types/store.ts";

export function readCatalogues(orchDir: OrchDir): Map<string, StoredCatalogue> {
  const rows = orm(orchDir).select().from(catalogues).orderBy(asc(catalogues.command)).all();
  return new Map(rows.map((row) => [row.command, { at: row.at, stdout: row.stdout }]));
}

export function writeCatalogue(orchDir: OrchDir, command: string, entry: StoredCatalogue): void {
  if (entry.stdout.length === 0) return;
  orm(orchDir).insert(catalogues).values({ command, ...entry }).onConflictDoUpdate({
    target: catalogues.command,
    set: entry,
  }).run();
}

export function clearCatalogues(orchDir: OrchDir): void {
  orm(orchDir).delete(catalogues).run();
}
