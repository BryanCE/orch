import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores } from "../../src/store/connection.ts";
import { provenDaemonPid } from "../../src/daemon/client/process.ts";
import { orchDirAt } from "../../src/services.ts";
import type { OrchDir } from "../../src/types/core.ts";

const undeleted: string[] = [];

/** A fresh temp directory minted as an orch dir. The one way a test gets an OrchDir:
 *  `mkdtempSync` alone yields a string, which nothing taking the orch dir accepts. */
export function tempOrchDir(prefix: string): OrchDir {
  return orchDirAt(mkdtempSync(join(tmpdir(), prefix)));
}

/** Kill the detached orchd a CLI-driven test auto-started under this dir; a live daemon holds
 *  the dir's orch.db open. Only a PROVEN owner is signalled — fixtures seed locks naming this
 *  very test runner's pid, and a start-token match is what no seeded record can fake. */
function killTempDirDaemon(dir: string): void {
  // Any temp dir a test removes MAY have been used as an orch dir; a dir that never was
  // one simply holds no lock. The mint here is that "maybe", not a claim about the path.
  const pid = provenDaemonPid(orchDirAt(dir));
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
function sweepTempDirs(): void {
  for (const dir of undeleted.splice(0)) {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

process.once("exit", sweepTempDirs);
