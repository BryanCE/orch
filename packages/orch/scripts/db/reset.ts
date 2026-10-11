import { existsSync, rmSync, statSync } from "node:fs";
import { assertStoreRecreatable, databasePath, livePresenceHolders, storeFiles } from "../../src/store/connection.ts";
import { backupDir, backupOrchState, restoreOrchState } from "../../src/store/backup.ts";
import { errorMessage } from "../../src/util.ts";
import { provenDaemonPid, terminateDaemon } from "../../src/daemon/client/process.ts";
import { buildStore, reportStore } from "./build.ts";
import { targetStoreDir } from "./store.ts";

// Total reset: keep a copy of the store, remove it, and rebuild it empty at the
// current migration. This is the answer to a breaking schema change, and it
// finishes the job - it hands back a store orch can open, never a hole where one
// used to be.
// Dry-run convention - no flag deletes for real, `--dry-run` only previews.
const isDryRun = process.argv.includes("--dry-run");

const ORCH_DIR = targetStoreDir();
const STORE = databasePath(ORCH_DIR);
const STORE_FILES = storeFiles(ORCH_DIR);
function describe(file: string): string {
  if (!existsSync(file)) return `${file} (absent)`;
  return `${file} (${statSync(file).size} bytes)`;
}

// One guard for every rebuild of this store, wherever it is asked from: a slave
// never rebuilds it at all, and nobody rebuilds it under a live worker.
const holders = livePresenceHolders(ORCH_DIR);
if (!isDryRun) {
  try {
    assertStoreRecreatable(ORCH_DIR);
  } catch (error: unknown) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exit(1);
  }
}

const present = STORE_FILES.filter((file) => existsSync(file));
const daemonPid = provenDaemonPid(ORCH_DIR);

if (isDryRun) {
  if (daemonPid !== undefined) process.stdout.write(`[dry-run] would stop orchd (pid ${daemonPid})\n`);
  if (present.length) {
    process.stdout.write(`[dry-run] would back up to ${backupDir(ORCH_DIR, "reset")}\n`);
    for (const file of STORE_FILES) process.stdout.write(`[dry-run] would remove ${describe(file)}\n`);
  } else {
    process.stdout.write(`[dry-run] nothing to remove: ${STORE} does not exist\n`);
  }
  if (holders.workers.length) process.stdout.write(`[dry-run] WOULD REFUSE: ${holders.workers.length} live worker(s): ${holders.workers.join(", ")}\n`);
  if (holders.registered.length) {
    process.stdout.write(`[dry-run] ${holders.registered.length} live terminal(s) and session(s) register again on their next command: ${holders.registered.join(", ")}\n`);
  }
  process.stdout.write(`[dry-run] would rebuild it empty at the current migration.\n`);
  process.stdout.write(`[dry-run] re-run without --dry-run to do it.\n`);
  process.exit(0);
}

// orchd holds the store open; stopped, it cannot write into the file being replaced.
// The next orch command starts it on the new store.
if (daemonPid !== undefined) {
  await terminateDaemon(daemonPid, 5_000);
  process.stdout.write(`stopped orchd (pid ${daemonPid})\n`);
}

const backup = backupOrchState(ORCH_DIR, "reset");
for (const file of backup.files) {
  if (file.kind === "copied") process.stdout.write(`backed up ${file.copy}\n`);
}
for (const file of present) {
  rmSync(file, { force: true });
  process.stdout.write(`removed ${file}\n`);
}

// A reset leaves a store, not a hole: the next orch command must find one it can
// open rather than a missing file it has to explain.
try {
  reportStore("db:reset", ORCH_DIR, buildStore(ORCH_DIR));
} catch (error) {
  restoreOrchState(backup);
  process.stderr.write(`db:reset could not rebuild the store: ${error instanceof Error ? error.message : String(error)}\n`);
  process.stderr.write(`put the backup back, so ${STORE} is the store this run started with.\n`);
  process.exit(1);
}
