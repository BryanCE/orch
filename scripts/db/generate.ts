import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { assertHostOwnsStore } from "./store.ts";

/**
 * Generate the migration folder from `src/db/schema.ts`, from scratch.
 *
 * Nothing has published (Rule 14): there is no installed base whose store has to
 * be walked forward, so orch keeps ONE migration describing the current schema
 * rather than a chain describing how it got here. Regenerating from an empty
 * folder is what makes generation boring:
 *
 *  - drizzle-kit never asks "created or renamed?", because against an empty
 *    baseline every column is simply created. Those prompts are unanswerable in
 *    CI and are how `runs.workspace` became a hand-written migration.
 *  - a view or trigger cannot be created twice, because there is only one
 *    migration to carry it. A changed view definition used to land beside the
 *    old one and the replay died with "table task_states already exists".
 *  - the snapshot can never disagree with the schema, because it is rebuilt with
 *    it. A stale snapshot silently reports "no changes" for a real edit.
 *
 * The store itself is NOT touched here. `bun db:reset` rebuilds that, and backs
 * it up first.
 */
const REPO = join(import.meta.dirname, "..", "..");
const MIGRATIONS = join(REPO, "drizzle");
const isDryRun = process.argv.includes("--dry-run");

assertHostOwnsStore("db:gen");

function report(line: string): void {
  process.stdout.write(`${line}\n`);
}

function existingMigrations(): string[] {
  if (!existsSync(MIGRATIONS)) return [];
  return readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const previous = existingMigrations();
report("");
report(`db:gen  ${isDryRun ? "preview - " : ""}regenerating drizzle/ from src/db/schema.ts`);
if (previous.length) report(`  replacing        ${String(previous.length).padStart(2)}  ${previous.join(", ")}`);
else report("  replacing         0  (empty folder)");

if (isDryRun) {
  report("");
  report("  re-run without --dry-run to write.");
  report("");
  process.exit(0);
}

// A partial folder is worse than none: drizzle-kit would diff against whatever
// snapshot survived and emit half a schema.
rmSync(MIGRATIONS, { recursive: true, force: true });
mkdirSync(MIGRATIONS, { recursive: true });

function run(step: string, argv: readonly string[]): void {
  const [bin, ...args] = argv;
  if (bin === undefined) throw new Error(`${step}: empty command`);
  const ran = spawnSync(bin, args, { cwd: REPO, stdio: "inherit" });
  if (ran.error) throw ran.error;
  if (ran.status !== 0) {
    process.stderr.write(`db:gen: ${step} exited ${String(ran.status ?? "by signal")}\n`);
    process.exit(ran.status ?? 1);
  }
}

// Tables only. The views and triggers drizzle-kit cannot build are created at
// store open from the generated migrations, so nothing post-processes what it wrote.
run("drizzle-kit generate", [process.execPath, join(REPO, "node_modules/drizzle-kit/bin.cjs"), "generate"]);

const written = existingMigrations();
report("");
report(`db:gen  wrote ${written.length === 1 ? written[0]! : `${String(written.length)} migrations`}`);
report("");
