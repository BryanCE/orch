import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { UNEMITTED_DDL, type UnemittedStatement } from "../../src/store/schema.ts";

// drizzle-kit emits neither STRICT nor WITHOUT ROWID (drizzle-orm #2435 and #408
// are both open), and has no builder for views or triggers. `bun db:gen` runs
// drizzle-kit and then this, so a generated migration is never hand-edited and a
// re-generate cannot forget what the hand-edit knew.
// Dry-run convention - no flag rewrites for real, `--dry-run` only previews.
const isDryRun = process.argv.includes("--dry-run");

const REPO = join(import.meta.dirname, "..", "..");
const MIGRATIONS = join(REPO, "drizzle");
const BREAKPOINT = "--> statement-breakpoint";

interface HardenedMigration {
  readonly sql: string;
  readonly strict: number;
  readonly withoutRowid: number;
}

/** SQLite refuses WITHOUT ROWID on a table whose key IS the rowid, so the
 *  declaration is read off the generated column rather than kept in a second list. */
function storageClause(createTableBlock: readonly string[]): string {
  return createTableBlock.some((line) => /AUTOINCREMENT/i.test(line)) ? ") STRICT;" : ") STRICT, WITHOUT ROWID;";
}

/** Close every `CREATE TABLE` in one migration with its storage clause. drizzle
 *  puts the closing `);` on its own line, which is what bounds each block. */
function hardenTables(sql: string): HardenedMigration {
  const lines = sql.split("\n");
  const hardened: string[] = [];
  let block: string[] | null = null;
  let strict = 0;
  let withoutRowid = 0;
  for (const line of lines) {
    if (line.startsWith("CREATE TABLE")) block = [];
    if (block && /^\)\s*(STRICT|WITHOUT)/i.test(line.trim())) block = null;
    if (block && line.trim() === ");") {
      const clause = storageClause(block);
      strict++;
      if (clause.includes("WITHOUT ROWID")) withoutRowid++;
      hardened.push(clause);
      block = null;
      continue;
    }
    block?.push(line);
    hardened.push(line);
  }
  return { sql: hardened.join("\n"), strict, withoutRowid };
}

/** drizzle-kit writes one directory per migration, each holding a `migration.sql`,
 *  named by the timestamp that also orders them. */
function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(entry.name, "migration.sql"))
    .filter((file) => existsSync(join(MIGRATIONS, file)))
    .sort();
}

function isView(statement: UnemittedStatement): boolean {
  return statement.sql.startsWith("CREATE VIEW");
}

function report(line: string): void {
  process.stdout.write(`${line}\n`);
}

function heading(): void {
  report("");
  report(`db:harden  ${isDryRun ? "preview - " : ""}SQL drizzle-kit cannot emit`);
}

const files = migrationFiles();
if (!files.length) {
  process.stderr.write(`no migrations in ${MIGRATIONS}; run 'bun db:gen' first\n`);
  process.exit(1);
}

const rewritten = new Map<string, HardenedMigration>();
for (const file of files) {
  const original = readFileSync(join(MIGRATIONS, file), "utf8");
  const hardened = hardenTables(original);
  if (hardened.sql !== original) rewritten.set(file, hardened);
}

// A view or trigger already created by an earlier migration must not be created
// again, so presence is judged across the whole folder and the missing ones land
// on the newest migration - the one whose tables they describe.
const newest = files[files.length - 1]!;
const folderSql = files.map((file) => readFileSync(join(MIGRATIONS, file), "utf8")).join("\n");
const missing = UNEMITTED_DDL.filter((statement) => !folderSql.includes(statement.sql));
if (missing.length) {
  const current = rewritten.get(newest);
  const base = current?.sql ?? readFileSync(join(MIGRATIONS, newest), "utf8");
  const appended = missing.map((statement) => `${BREAKPOINT}\n${statement.sql}`).join("\n");
  rewritten.set(newest, {
    sql: `${base.replace(/\s*$/, "")}\n${appended}\n`,
    strict: current?.strict ?? 0,
    withoutRowid: current?.withoutRowid ?? 0,
  });
}

if (!rewritten.size) {
  heading();
  report("  nothing to do - every migration already carries it");
  report("");
  process.exit(0);
}

heading();
for (const [file, hardened] of rewritten) {
  report(`  ${relative(REPO, join(MIGRATIONS, file))}`);
  if (hardened.strict) report(`    STRICT           ${String(hardened.strict).padStart(2)} tables`);
  if (hardened.withoutRowid) report(`    WITHOUT ROWID    ${String(hardened.withoutRowid).padStart(2)} tables`);
  if (file !== newest) continue;
  const views = missing.filter(isView);
  const triggers = missing.filter((statement) => !isView(statement));
  if (views.length) report(`    views            ${String(views.length).padStart(2)}  ${views.map((statement) => statement.name).join(", ")}`);
  if (triggers.length) report(`    triggers         ${String(triggers.length).padStart(2)}  ${triggers.map((statement) => statement.name).join(", ")}`);
}

if (isDryRun) {
  report("");
  report("  re-run without --dry-run to write.");
  report("");
  process.exit(0);
}

for (const [file, hardened] of rewritten) writeFileSync(join(MIGRATIONS, file), hardened.sql);
report("");
