import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { assertHostOwnsStore } from "./store.ts";

/**
 * Generate migrations from `src/db/schema.ts` the way drizzle-kit does it:
 * diffed against the snapshot already in `drizzle/`, so an unchanged schema
 * emits nothing and a store built from the current folder keeps opening.
 *
 * `--from-scratch` is the occasional reset, not the default: it empties
 * `drizzle/` first so drizzle-kit emits ONE migration describing the current
 * schema. Reach for it when dev work has left the chain unreplayable (a view
 * or trigger created twice, a snapshot that disagrees with the schema, a
 * "created or renamed?" prompt nobody can answer). Every store built from the
 * previous folder must then be rebuilt with `bun db:reset`.
 *
 * The store itself is NOT touched here. `bun db:reset` rebuilds that, and backs
 * it up first.
 */
const REPO = join(import.meta.dirname, "..", "..");
const MIGRATIONS = join(REPO, "drizzle");
const require = createRequire(import.meta.url);
// drizzle-kit does not export its CLI subpath; resolve its package entry through
// the hoisted dependency tree, then address the shipped bin within that package.
const DRIZZLE_KIT_BIN = join(dirname(require.resolve("drizzle-kit")), "bin.cjs");
const isDryRun = process.argv.includes("--dry-run");
const fromScratch = process.argv.includes("--from-scratch");

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
report(`db:gen  ${isDryRun ? "preview - " : ""}${fromScratch ? "regenerating" : "generating"} drizzle/ from src/db/schema.ts`);
const verb = fromScratch ? "replacing" : "existing";
if (previous.length) report(`  ${verb.padEnd(16)} ${String(previous.length).padStart(2)}  ${previous.join(", ")}`);
else report(`  ${verb.padEnd(16)}  0  (empty folder)`);

if (isDryRun) {
  report("");
  report("  re-run without --dry-run to write.");
  report("");
  process.exit(0);
}

if (fromScratch) {
  // A partial folder is worse than none: drizzle-kit would diff against whatever
  // snapshot survived and emit half a schema.
  rmSync(MIGRATIONS, { recursive: true, force: true });
  mkdirSync(MIGRATIONS, { recursive: true });
}

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
run("drizzle-kit generate", [process.execPath, DRIZZLE_KIT_BIN, "generate"]);

const added = fromScratch ? existingMigrations() : existingMigrations().filter((name) => !previous.includes(name));
report("");
report(added.length ? `db:gen  wrote ${added.join(", ")}` : "db:gen  no schema change; nothing written");
report("");
