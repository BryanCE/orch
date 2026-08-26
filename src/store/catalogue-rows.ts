import { openStore } from "./connection.ts";

export interface StoredCatalogue {
  at: number;
  stdout: string;
}

interface CatalogueRow {
  command: string;
  at: number;
  stdout: string;
}

export function readCatalogues(orchDir: string): Map<string, StoredCatalogue> {
  const rows = openStore(orchDir)
    .query("SELECT command, at, stdout FROM catalogues ORDER BY command")
    .all() as CatalogueRow[];
  return new Map(rows.map((row) => [row.command, { at: row.at, stdout: row.stdout }]));
}

export function writeCatalogue(orchDir: string, command: string, entry: StoredCatalogue): void {
  if (entry.stdout.length === 0) return;
  openStore(orchDir)
    .query(
      `INSERT INTO catalogues (command, at, stdout)
       VALUES (?, ?, ?)
       ON CONFLICT(command) DO UPDATE SET at = excluded.at, stdout = excluded.stdout`,
    )
    .run(command, entry.at, entry.stdout);
}

export function clearCatalogues(orchDir: string): void {
  openStore(orchDir).query("DELETE FROM catalogues").run();
}
