import { rmSync } from "node:fs";
import { closeAllStores } from "../../src/store/sqlite.ts";

// Block synchronously for a short spell without depending on any runtime's sleep.
function pauseMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// A cached SQLite file handle keeps the store's db file open for the life of the
// test process; on Windows that blocks removal of the containing temp dir with
// EBUSY. Close this process's store connections first. A spawned child worker
// can also hold the db file briefly after it exits, so retry a bounded number of
// times on the transient Windows lock codes. Node-safe and idempotent, so it is
// fine to call from a per-dir cleanup loop.
export function removeTempDir(dir: string): void {
  closeAllStores();
  // A spawned child worker's db handle can linger for seconds after it exits
  // under a loaded full-suite run on Windows; give it generous headroom.
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "EBUSY" && code !== "ENOTEMPTY" && code !== "EPERM") throw error;
      pauseMs(100);
    }
  }
  // Final attempt: if a child's handle still lingers past the retry budget, a
  // leaked temp dir under the OS temp root is harmless (the OS reaps it) and must
  // not fail an otherwise-passing test, so swallow the transient Windows lock codes.
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "EBUSY" && code !== "ENOTEMPTY" && code !== "EPERM") throw error;
  }
}
