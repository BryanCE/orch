import { rmSync } from "node:fs";
import { closeAllStores } from "../../src/store/sqlite.ts";

// Close this process's cached SQLite handles before removing a test's temp dir
// (a spawned orch child closes its own store on exit via bin/orch.ts, so no WAL
// handle lingers), then let rmSync's native maxRetries/retryDelay ride out the
// transient EBUSY that git-worktree and spawned subprocesses leave on Windows
// for a beat after they exit. This is Node's documented Windows-lock handling.
export function removeTempDir(dir: string): void {
  closeAllStores();
  rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
