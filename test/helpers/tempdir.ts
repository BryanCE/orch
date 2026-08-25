import { rmSync } from "node:fs";
import { closeAllStores } from "../../src/store/sqlite.ts";
import { provenDaemonPid } from "../../src/daemon/lifecycle.ts";

const undeleted: string[] = [];

/** Kill the detached orchd a CLI-driven test auto-started under this dir; a live daemon holds
 *  the dir's orch.db open. Only a PROVEN owner is signalled — fixtures seed locks naming this
 *  very test runner's pid, and a start-token match is what no seeded record can fake. */
function killTempDirDaemon(dir: string): void {
  const pid = provenDaemonPid(dir);
  if (pid === undefined || pid === process.pid) return;
  try { process.kill(pid, "SIGTERM"); } catch {}
}

/** Remove a test's temp dir, or set it aside for the sweep. Windows keeps a directory locked
 *  until every handle inside it closes, and no test's verdict depends on whether that happened
 *  before the next test started. */
export function removeTempDir(dir: string): void {
  closeAllStores();
  killTempDirDaemon(dir);
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    undeleted.push(dir);
  }
}

/** Delete what the per-test removal could not, once the suite has stopped writing. */
export function sweepTempDirs(): void {
  for (const dir of undeleted.splice(0)) {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

process.once("exit", sweepTempDirs);
