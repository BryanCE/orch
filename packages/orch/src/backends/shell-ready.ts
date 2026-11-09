import type { Backend, BackendHandle, ForegroundProcesses } from "../types/backend.ts";
import { NO_FOREGROUND } from "../shared/shell-prompt.ts";

/** What runs in a place now, or nothing when its environment cannot say. */
export function foregroundOf(backend: Pick<Backend, "foreground">, handle: BackendHandle): ForegroundProcesses {
  return backend.foreground?.read(handle) ?? NO_FOREGROUND;
}

/** Sleep on this thread without a runtime dependency: orch ships to node, and
 *  every caller here is synchronous. */
export function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
