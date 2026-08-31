import { asc } from "drizzle-orm";
import { orm } from "./connection.ts";
import { catalogues } from "../db/schema.ts";
import type { StoredCatalogue } from "../types/store.ts";

export function readCatalogues(orchDir: string): Map<string, StoredCatalogue> {
  const rows = orm(orchDir).select().from(catalogues).orderBy(asc(catalogues.command)).all();
  return new Map(rows.map((row) => [row.command, { at: row.at, stdout: row.stdout }]));
}

export function writeCatalogue(orchDir: string, command: string, entry: StoredCatalogue): void {
  if (entry.stdout.length === 0) return;
  orm(orchDir).insert(catalogues).values({ command, ...entry }).onConflictDoUpdate({
    target: catalogues.command,
    set: entry,
  }).run();
}

export function clearCatalogues(orchDir: string): void {
  orm(orchDir).delete(catalogues).run();
}
