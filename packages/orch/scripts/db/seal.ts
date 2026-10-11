import { join } from "node:path";
import { DRIZZLE_DIR, migrationDirs, migrationSha256, readManifest, writeManifest } from "./released.ts";

const manifest = readManifest();
const added: string[] = [];
for (const directory of migrationDirs()) {
  if (manifest[directory] !== undefined) continue;
  manifest[directory] = migrationSha256(join(DRIZZLE_DIR, directory));
  added.push(directory);
}

writeManifest(manifest);
for (const directory of added) console.log(`sealed ${directory}`);
if (added.length === 0) console.log("No migrations added");
