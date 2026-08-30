import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { assertStoreRecreatable, livePresenceHolders } from "../../src/store/connection.ts";
import { errorMessage } from "../../src/util.ts";
import { buildStore, reportStore } from "./build.ts";
import { assertHostOwnsStore, targetStoreDir } from "./store.ts";

// Total reset: keep a copy of the store, remove it, and rebuild it empty at the
// current migration. This is the answer to a breaking schema change, and it
// finishes the job - it hands back a store orch can open, never a hole where one
// used to be.
// Dry-run convention - no flag deletes for real, `--dry-run` only previews.
const isDryRun = process.argv.includes("--dry-run");

assertHostOwnsStore("db:reset");

const ORCH_DIR = targetStoreDir();
/** WAL and shared-memory siblings go with the database; leaving one behind
 *  hands the next open a journal describing a file that no longer exists. */
const STORE_FILES = ["orch.db", "orch.db-wal", "orch.db-shm"];
const BACKUPS = join(ORCH_DIR, "backups");

function describe(file: string): string {
  const path = join(ORCH_DIR, file);
  if (!existsSync(path)) return `${path} (absent)`;
  return `${path} (${statSync(path).size} bytes)`;
}

/** Copy the store beside itself under a stamped name. The WAL and shared-memory
 *  siblings are copied too: a database separated from its journal is a database
 *  missing every write that had not yet been checkpointed. */
function backupPath(): string {
  return join(BACKUPS, `orch-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
}

interface StoreCopy {
  readonly file: string;
  readonly backup: string;
}

function backupStore(destination: string): StoreCopy[] {
  mkdirSync(BACKUPS, { recursive: true });
  const copied: StoreCopy[] = [];
  for (const file of STORE_FILES) {
    const source = join(ORCH_DIR, file);
    if (!existsSync(source)) continue;
    const backup = destination + file.slice("orch.db".length);
    copyFileSync(source, backup);
    copied.push({ file, backup });
  }
  return copied;
}

/** Put the copies back under their original names. A reset that cannot rebuild
 *  must leave the store it started with, never the hole in between. */
function restoreStore(copies: readonly StoreCopy[]): void {
  for (const copy of copies) copyFileSync(copy.backup, join(ORCH_DIR, copy.file));
}


// One guard for every rebuild of this store, wherever it is asked from: a slave
// never rebuilds it at all, and nobody rebuilds it under a live agent.
const holders = livePresenceHolders(ORCH_DIR);
if (!isDryRun) {
  try {
    assertStoreRecreatable(ORCH_DIR);
  } catch (error: unknown) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exit(1);
  }
}

const present = STORE_FILES.filter((file) => existsSync(join(ORCH_DIR, file)));

if (isDryRun) {
  if (present.length) {
    process.stdout.write(`[dry-run] would back up to ${backupPath()}\n`);
    for (const file of STORE_FILES) process.stdout.write(`[dry-run] would remove ${describe(file)}\n`);
  } else {
    process.stdout.write(`[dry-run] nothing to remove: ${join(ORCH_DIR, "orch.db")} does not exist\n`);
  }
  if (holders.length) process.stdout.write(`[dry-run] WOULD REFUSE: ${holders.length} live agent(s): ${holders.join(", ")}\n`);
  process.stdout.write(`[dry-run] would rebuild it empty at the current migration.\n`);
  process.stdout.write(`[dry-run] re-run without --dry-run to do it.\n`);
  process.exit(0);
}

const copies = backupStore(backupPath());
for (const copy of copies) process.stdout.write(`backed up ${copy.backup}\n`);
for (const file of present) {
  rmSync(join(ORCH_DIR, file), { force: true });
  process.stdout.write(`removed ${join(ORCH_DIR, file)}\n`);
}

// A reset leaves a store, not a hole: the next orch command must find one it can
// open rather than a missing file it has to explain.
try {
  reportStore("db:reset", ORCH_DIR, buildStore(ORCH_DIR));
} catch (error) {
  restoreStore(copies);
  process.stderr.write(`db:reset could not rebuild the store: ${error instanceof Error ? error.message : String(error)}\n`);
  process.stderr.write(`put the backup back, so ${join(ORCH_DIR, "orch.db")} is the store this run started with.\n`);
  process.exit(1);
}
