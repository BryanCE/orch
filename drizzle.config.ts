import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "drizzle-kit";
import { assertHostOwnsStore, targetStoreDir } from "./scripts/db/store.ts";

assertHostOwnsStore("drizzle-kit");

const storeDir = targetStoreDir();
mkdirSync(storeDir, { recursive: true });

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: join(storeDir, "orch.db") },
  verbose: true,
});
