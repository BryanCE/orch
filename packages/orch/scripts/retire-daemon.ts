import {
  clearDaemonRuntime,
  provenDaemonPid,
  readDaemonLock,
  terminateDaemon,
  unprovenLockRefusal,
} from "../src/daemon/lifecycle.ts";
import { orchDir } from "../src/presence/store.ts";
import { pidAlive } from "../src/util.ts";

// Every build replaces dist/, so an orchd that survives it runs code that no
// longer exists. Retire it here — the first step of every build — and clear the
// lock, socket and port it owned, because a lock left behind by a dead daemon
// refuses every later `orch daemon start`. Dry-run convention: no flag retires
// for real, `--dry-run` only previews.
const isDryRun = process.argv.includes("--dry-run");
const prefix = isDryRun ? "[dry-run] would " : "";
const directory = orchDir();

/** A live pid orch cannot tie to its own daemon is a stranger: clearing its lock
 *  would hand a second daemon the same orch dir. Warn, never fail the build. */
function strangerHoldsLock(): boolean {
  const lockPid = readDaemonLock(directory)?.pid;
  if (lockPid === undefined || !pidAlive(lockPid)) return false;
  process.stderr.write(`retire-daemon: ${unprovenLockRefusal(directory, lockPid)}\n`);
  return true;
}

const pid = provenDaemonPid(directory);
if (pid !== undefined) {
  process.stdout.write(`${prefix}stop orchd (pid ${pid})\n`);
  if (!isDryRun) await terminateDaemon(pid, 5000);
} else if (strangerHoldsLock()) {
  process.exit(0);
}

if (isDryRun) {
  process.stdout.write(`[dry-run] would clear the orchd lock, socket and port under ${directory}\n`);
} else {
  for (const file of clearDaemonRuntime(directory)) process.stdout.write(`removed ${file}\n`);
  process.stdout.write("retire-daemon: orchd is stopped and its runtime files are gone\n");
}
