import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "drizzle-kit";
import { targetStoreDir } from "./scripts/db/store.ts";

const storeDir = targetStoreDir();
mkdirSync(storeDir, { recursive: true });

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: join(storeDir, "orch.db") },
  verbose: true,
});
