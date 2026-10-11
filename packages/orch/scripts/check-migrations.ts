import { existsSync } from "node:fs";
import { join } from "node:path";
import { DRIZZLE_DIR, migrationDirs, migrationSha256, readManifest } from "./db/released.ts";

const manifest = readManifest();
const problems: string[] = [];
for (const [directory, expected] of Object.entries(manifest)) {
  const migrationPath = join(DRIZZLE_DIR, directory, "migration.sql");
  if (!existsSync(migrationPath)) {
    problems.push(`released migration missing: drizzle/${directory}/migration.sql`);
    continue;
  }
  const actual = migrationSha256(join(DRIZZLE_DIR, directory));
  if (actual !== expected) {
    problems.push(`released migration changed: drizzle/${directory}/migration.sql (expected ${expected}, found ${actual})`);
  }
}

if (process.argv.includes("--sealed")) {
  for (const directory of migrationDirs()) {
    if (manifest[directory] !== undefined) continue;
    problems.push(`unreleased migration: drizzle/${directory}/migration.sql; run bun run db:seal and commit`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exitCode = 1;
} else {
  console.log(`check:migrations OK (${Object.keys(manifest).length} released)`);
}
