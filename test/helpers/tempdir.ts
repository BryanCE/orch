import { rmSync } from "node:fs";
import { closeAllStores } from "../../src/store/sqlite.ts";

// Close this process's cached SQLite handles, then remove the dir with a REAL
// retry loop. bun's rmSync silently ignores node's maxRetries/retryDelay
// options (observed: identical instant-EBUSY timings with and without them),
// so the Windows lock-release lag after a spawned daemon/git-worktree process
// exits must be ridden out by hand. Cleanup is best-effort by design: a temp
// dir a background process still pins after the deadline is leaked to the OS
// temp cleaner with a warning — a test's verdict is its assertions, never
// whether Windows released a file handle in time.
export function removeTempDir(dir: string): void {
  closeAllStores();
  const deadline = Date.now() + 10_000;
  for (;;) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const retryable = code === "EBUSY" || code === "EPERM" || code === "ENOTEMPTY";
      if (!retryable) throw error;
      if (Date.now() >= deadline) {
        process.stderr.write(`removeTempDir: leaking ${dir} (${code} persisted past deadline)\n`);
        return;
      }
      Bun.sleepSync(200);
    }
  }
}
