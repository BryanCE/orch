import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const MANIFEST_PATH = join(import.meta.dir, "released-migrations.json");
export const DRIZZLE_DIR = join(import.meta.dir, "..", "..", "drizzle");

export function readManifest(): Record<string, string> {
  return z.record(z.string(), z.string()).parse(JSON.parse(readFileSync(MANIFEST_PATH, "utf8")));
}

export function writeManifest(manifest: Record<string, string>): void {
  const sortedManifest = Object.fromEntries(Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right)));
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(sortedManifest, null, 2)}\n`);
}

export function migrationSha256(dir: string): string {
  return createHash("sha256").update(readFileSync(join(dir, "migration.sql"))).digest("hex");
}

export function migrationDirs(): string[] {
  return readdirSync(DRIZZLE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(DRIZZLE_DIR, entry.name, "migration.sql")))
    .map((entry) => entry.name)
    .sort();
}
