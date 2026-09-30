import { homedir } from "node:os";
import { join } from "node:path";
import type { OrchDir } from "./types/core.ts";

/** The one place a path becomes an orch dir. Called where a path crosses in from outside
 *  the type system: the ORCH_DIR env read below, a test's temp dir, a CLI flag. The cast
 *  is the brand's mint, and it exists nowhere else. */
export function orchDirAt(path: string): OrchDir {
  return path as OrchDir;
}

/** The ONE read of ORCH_DIR. Every other module receives the directory as a value. */
export function envOrchDir(): OrchDir {
  return orchDirAt(process.env.ORCH_DIR ?? join(homedir(), ".orch"));
}
